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
            text: 'Hello!'
        })
    } catch(err) {
        await callApi("/sendMessage", {
            chat_id,
            text: 'Something Went wrong!'
        })   
    }
}
