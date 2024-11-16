import { MongoClient } from 'mongodb'
import { applyMongoFilters, getId, makeQuery } from './utils.js';
import type { QueryParams } from './utils.js';

export default async function createMongoDb({ uri, db: dbName }: { uri: string, db: string}) {
    const client = new MongoClient(uri);
    await client.connect();
    let db = client.db(dbName);

    return <T>(collectionName: string) => {
        const collection = db.collection(collectionName);

        return {
            query: makeQuery(async ({ filters, sort, mappers, ...more }: QueryParams<T>) => {
                const query = applyMongoFilters(filters)

                const options: any = {}

                if (sort) {
                    options.$sort = {
                        [sort.field]: sort.order === 'ASC' ? 1 : -1
                    }
                }

                if (more.mode == 'all') {
                    return collection.find(query, options).toArray().then(res => res.map((x: any) => {
                        const id = x._id
                        delete x._id


                        let result = { id, ...x }
                        for (let mapper of mappers) {
                            result = mapper(result)
                        }
                        return result
                    }))
                }

                if (more.mode == 'first') {
                    return collection.findOne(query, options).then((x: any) => {
                        let result = undefined

                        if (x) {
                            const id = x._id
                            delete x._id
                            result = { id, ...x }
                        }

                        for (let mapper of mappers) {
                            result = mapper(result)
                        }

                        return result

                    })
                }

                if (more.mode == 'paginate') {
                    more.page ??=1
                    more.perPage ??=10
                    const skip = (more.page - 1) * more.perPage

                    const res = await collection.aggregate([
                        {
                            "$facet": {
                                "data": [
                                    { "$match": query },
                                    options.$sort ? { "$sort": options.$sort } : null,
                                    { "$skip": skip },
                                    { "$limit": more.perPage }
                                ].filter(Boolean),
                                "total": [
                                    { "$match": query },
                                    { "$count": "count" }
                                ]
                            }
                        }
                    ]).toArray()

                    const { data, total } = res[0]

                    return {
                        data: data.map((x: any) => {
                            const id = x._id
                            delete x._id

                            let result = { id, ...x }
                            for (let mapper of mappers) {
                                result = mapper(result)
                            }
                            return result
                        }),
                        page: more.page,
                        perPage: more.perPage,
                        total: total?.[0]?.count ?? 0
                    }
                }
            }),
            async insert<T>(data: T) {
                data = {
                    _id: getId(),
                    ...data,
                    createdAt: new Date().valueOf(),
                    updatedAt: 0
                }

                const result = await collection.insertOne(data as any);

                return { id: result.insertedId, ...data }
            },
            async update<T>(data: T & any) {
                const { id, createdAt, ...payload } = data
                payload.updatedAt = new Date().valueOf()

                const { _id, ...res }: any = await collection.findOneAndUpdate(
                    { _id: id },
                    { $set: payload },
                );

                return { id, ...res, ...payload }
            }, async remove(id: string) {
                // @ts-ignore
                await collection.findOneAndDelete({ _id: id });
                return true;
            },
        }
    }
}
