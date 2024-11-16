import 'dotenv/config'
// const url = ''
const url = process.env.TG_WEBHOOK_URL + 'api/webhook'
const telegramUrl = 'https://api.telegram.org/bot' + process.env.TG_API_TOKEN + '/setWebhook?url=' + url
//
//
console.log(telegramUrl)
const res = await fetch(telegramUrl).then(res => res.json())
//
//
console.log(res)
