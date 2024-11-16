import { TG_API_TOKEN } from '$env/static/private'

export async function callApi(path = '/', body = {}) {
    const baseUrl = 'https://api.telegram.org/bot' + TG_API_TOKEN;
    //
    console.log('call telegram api: ' +  path)
    console.log(JSON.stringify(body, null, 2))

    const res = await fetch(baseUrl + path, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body)}).then(res => res.json())

    if(res.ok) {

        return res.result;
    } else {
        throw new Error(JSON.stringify(res.description))
    }
}

