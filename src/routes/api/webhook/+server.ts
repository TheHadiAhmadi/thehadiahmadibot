import { TG_API_TOKEN } from '$env/static/private'
import {db} from '$lib/server'
import { callApi } from '$lib/server/telegram'
import type { RequestEvent } from './$types'

export async function POST({request}: RequestEvent)
{
    const body = await request.json()
    const chat_id = body.message?.chat.id

    await db('user_messages').insert({type: 'event_from_user', body})

    try {
        await callApi("/sendMessage", {
            chat_id,
            text: `1. Clockify
2. Note taking
3. AI integration
4. postman alternative
5. Github integration
6. deploy projects
7. Manage ssh servers`
        })
    } catch(err) {
        await callApi("/sendMessage", {
            chat_id,
            text: 'Something Went wrong!'
        })   
    }
    return new Response("{}")
}
