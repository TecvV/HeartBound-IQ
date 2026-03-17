const express = require('express');
const router = express.Router();
const Guest = require('../models/Guest');

// GET /rsvp/:token - public RSVP page
router.get('/:token', async (req, res) => {
  try {
    const token = req.params.token;
    const guest = await Guest.findOne({ rsvpToken: token });
    if (!guest) return res.status(404).send('Invalid RSVP link.');

    res.set('Content-Type', 'text/html; charset=utf-8');
    res.send(`<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>RSVP</title>
<style>
body{font-family:Georgia,serif;background:#0a0508;color:#f5e6d0;margin:0;padding:0}
.container{max-width:520px;margin:40px auto;padding:24px;border:1px solid rgba(201,168,76,0.4);border-radius:12px;background:#140a10}
h1{font-size:18px;letter-spacing:0.18em;text-transform:uppercase;color:#c9a84c;text-align:center}
label{display:block;margin:14px 0 6px;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#c9a84c}
input,select{width:100%;padding:10px 12px;border-radius:8px;border:1px solid rgba(201,168,76,0.3);background:#0d0810;color:#f5e6d0;font-size:14px}
button{width:100%;margin-top:16px;padding:12px;border:0;border-radius:8px;background:#c8667a;color:white;font-size:14px;cursor:pointer}
.note{font-size:12px;color:#cbb9a0;text-align:center;margin-top:10px}
.msg{margin-top:12px;text-align:center;font-size:13px}
</style></head><body>
<div class="container">
<h1>RSVP</h1>
<div style="text-align:center;margin-top:8px">Dear ${guest.name}, please confirm.</div>
<label>Status</label>
<select id="status">
  <option value="confirmed">Confirm</option>
  <option value="declined">Decline</option>
</select>
<label>Guests (including you)</label>
<input id="count" type="number" min="1" max="20" value="1"/>
<button onclick="submitRSVP()">Submit RSVP</button>
<div class="msg" id="msg"></div>
<div class="note">Your response will be saved instantly.</div>
</div>
<script>
async function submitRSVP(){
  const status=document.getElementById('status').value;
  const count=document.getElementById('count').value;
  const res=await fetch('/api/rsvp/token', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ token:'${token}', status, count })});
  const data=await res.json();
  const msg=document.getElementById('msg');
  if(data && data.success){ msg.textContent='Thank you! Your response has been recorded.'; }
  else { msg.textContent=data.error||'Could not save RSVP.'; }
}
</script>
</body></html>`);
  } catch (e) {
    res.status(500).send('RSVP error.');
  }
});

module.exports = router;
