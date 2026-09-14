/**
 * S3tek Elevate — single Apps Script backend for:
 *  - Lead form submissions (Home / Services / Contact)  -> "Leads" sheet
 *  - Client portal messages                              -> "Messages" sheet
 *  - Client portal weekly goals (backup log)              -> "Goals" sheet
 *  - Brand Tensor AI positioning-gap analysis             -> "BrandTensor" sheet
 *
 * SETUP
 * 1. Create a Google Sheet with 4 tabs named exactly: Leads, Messages, Goals, BrandTensor
 *    Leads header row:       Timestamp | Name | Business | Email | Phone | Message | Page
 *    Messages header row:    Timestamp | Client | From | Text
 *    Goals header row:       Timestamp | Client | GoalsJSON
 *    BrandTensor header row: Timestamp | Client | Website | GBP | Instagram | Facebook | Description | OverallScore | RawResult
 * 2. Extensions -> Apps Script, paste this whole file in.
 * 3. (Optional, for Brand Tensor to actually run) Project Settings -> Script Properties ->
 *    add GROQ_API_KEY = your free key from console.groq.com. Without this, Brand Tensor returns a clear "not configured" message.
 * 4. Deploy -> New deployment -> Web app -> Execute as Me, Who has access: Anyone.
 * 5. Copy the /exec URL into SHEET_ENDPOINT in script.js.
 */

function _sheet(name) {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
}

function _json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  const type = (e.parameter.type || '').toLowerCase();
  const client = e.parameter.client || '';

  if (type === 'messages') {
    const sheet = _sheet('Messages');
    if (!sheet) return _json({ rows: [] });
    const data = sheet.getDataRange().getValues();
    const rows = [];
    for (let i = 1; i < data.length; i++) {
      if (!client || data[i][1] === client) {
        rows.push({ time: data[i][0], client: data[i][1], from: data[i][2], text: data[i][3] });
      }
    }
    return _json({ rows });
  }

  return _json({ ok: true });
}

function doPost(e) {
  let payload = {};
  const ct = e.postData && e.postData.type;
  if (ct && ct.indexOf('json') !== -1 || (e.postData && e.postData.contents && e.postData.contents.trim().startsWith('{'))) {
    try { payload = JSON.parse(e.postData.contents); } catch (err) { payload = {}; }
  } else {
    payload = e.parameter;
  }

  const type = (payload.type || 'lead').toLowerCase();

  if (type === 'lead') return _handleLead(payload);
  if (type === 'message') return _handleMessage(payload);
  if (type === 'goals') return _handleGoals(payload);
  if (type === 'brandtensor') return _handleBrandTensor(payload);

  return _json({ error: 'unknown type' });
}

function _handleLead(p) {
  const sheet = _sheet('Leads');
  if (sheet) {
    sheet.appendRow([new Date(), p.name || '', p.business || '', p.email || '', p.phone || '', p.message || p.goal || p.focus || '', p.page || '']);
  }
  return _json({ status: 'ok' });
}

function _handleMessage(p) {
  const sheet = _sheet('Messages');
  if (sheet) {
    sheet.appendRow([new Date(), p.client || '', p.from || '', p.text || '']);
  }
  return _json({ status: 'ok' });
}

function _handleGoals(p) {
  const sheet = _sheet('Goals');
  if (sheet) {
    sheet.appendRow([new Date(), p.client || '', JSON.stringify(p.goals || [])]);
  }
  return _json({ status: 'ok' });
}

/**
 * Brand Tensor: fetches the website (and best-effort the GBP link) server-side
 * (no CORS restriction here, unlike a browser), strips tags to get visible text,
 * then asks an open-weight Llama model (via Groq's free tier) to score the gap between stated positioning and what's live.
 * Instagram/Facebook links are logged only — those platforms block simple scraping,
 * so the scored analysis does not depend on being able to read them.
 */
function _handleBrandTensor(p) {
  const apiKey = PropertiesService.getScriptProperties().getProperty('GROQ_API_KEY');

  const websiteText = _fetchTextSafe(p.website);
  const gbpText = _fetchTextSafe(p.gbp);

  let result;
  if (!apiKey) {
    result = {
      overallScore: null,
      summary: "Brand Tensor isn't fully wired up yet — add a free GROQ_API_KEY in Script Properties to turn on real analysis. Your links have been logged for manual review.",
      sense: { score: null, note: 'Not scored — backend not configured.' },
      structure: { score: null, note: 'Not scored — backend not configured.' },
      surface: { score: null, note: 'Not scored — backend not configured.' }
    };
  } else {
    result = _callGroqForBrandTensor(apiKey, p, websiteText, gbpText);
  }

  const sheet = _sheet('BrandTensor');
  if (sheet) {
    sheet.appendRow([new Date(), p.client || '', p.website || '', p.gbp || '', p.instagram || '', p.facebook || '', p.desc || '', result.overallScore || '', JSON.stringify(result)]);
  }

  return _json(result);
}

function _fetchTextSafe(url) {
  if (!url) return '';
  try {
    const res = UrlFetchApp.fetch(url, { muteHttpExceptions: true, followRedirects: true });
    const html = res.getContentText();
    const text = html.replace(/<script[\s\S]*?<\/script>/gi, ' ')
                      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
                      .replace(/<[^>]+>/g, ' ')
                      .replace(/\s+/g, ' ')
                      .trim();
    return text.slice(0, 6000);
  } catch (err) {
    return '';
  }
}

function _callGroqForBrandTensor(apiKey, p, websiteText, gbpText) {
  const prompt = `You are Brand Tensor, a brand-positioning gap scorer for S3tek Elevate.
The client describes their intended positioning below, then gives you what's actually live on their website and Google Business Profile. Score the GAP between intention and reality — a high score means the live presence clearly delivers the stated positioning; a low score means there's a real mismatch.

STATED POSITIONING:
${p.desc || '(not provided)'}

WEBSITE TEXT (may be partial/empty if the fetch failed):
${websiteText || '(could not fetch)'}

GOOGLE BUSINESS PROFILE TEXT (may be partial/empty):
${gbpText || '(could not fetch)'}

Instagram: ${p.instagram || '(not provided)'}
Facebook: ${p.facebook || '(not provided)'}
(Note: social links are informational only — you cannot browse them.)

Return ONLY valid JSON, no markdown, in exactly this shape:
{"overallScore": <0-100 integer>, "summary": "<one or two honest sentences>",
 "sense": {"score": <0-100>, "note": "<one sentence on message/positioning clarity>"},
 "structure": {"score": <0-100>, "note": "<one sentence on site/identity consistency>"},
 "surface": {"score": <0-100>, "note": "<one sentence on local/GBP presence, or that social couldn't be checked>"}}`;

  // Groq: free tier, OpenAI-compatible endpoint, open-weight Llama model
  const res = UrlFetchApp.fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'post',
    contentType: 'application/json',
    headers: { 'Authorization': 'Bearer ' + apiKey },
    muteHttpExceptions: true,
    payload: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 700,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  try {
    const data = JSON.parse(res.getContentText());
    const text = data.choices && data.choices[0] && data.choices[0].message.content ? data.choices[0].message.content : '{}';
    const cleaned = text.replace(/```json|```/g, '').trim();
    return JSON.parse(cleaned);
  } catch (err) {
    return {
      overallScore: null,
      summary: 'Analysis failed — the AI response could not be parsed. Try again, or check the Apps Script execution log.',
      sense: { score: null, note: '' }, structure: { score: null, note: '' }, surface: { score: null, note: '' }
    };
  }
}
