import { customAlphabet } from 'nanoid';

const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
export const getId = customAlphabet(alphabet, 8);

type FilterOperator = '=' | '!=' | 'like' | 'in' | 'all' | 'between' | '<' | '<=' | '>' | '>='
type QueryFilter<T> = (field: string, operator: FilterOperator, value: any) => QueryHandler<T>

type Paginated<T> = {
    data: T[]
    page: number
    perPage: number
    total: number
}

export type QueryParams<T> = { 
    page: number,
    perPage: number,
    sort: Sort, 
    filters: Filter[], 
    mappers: Mapper<T>[],
    mode: 'all' | 'paginate' | 'first'
}

type QueryHandler<T> = (params: any) => {
    filter: QueryFilter<T>,
    all: () => Promise<T[]>,
    paginate: (page: number, perPage: number) => Promise<Paginated<T>>,
    sort: (field: string, order: 'ASC' | 'DESC') => QueryHandler<T>,
    map: (mapper: Mapper<T>) => QueryHandler<T>,
    first: () => Promise<T>
}

type Filter = { field: string, operator: FilterOperator, value: any }
type Mapper<T> = (item: T) => T
type Sort = { field: string, order: 'ASC' | 'DESC' }

export function makeQuery<T>(handler: QueryHandler<T>) {
    let filters: Filter[] = []
    let mappers: Mapper<any>[] = []
    let sortValue: Sort | undefined = undefined

    function filter(field: string, operator: FilterOperator, value: any) {
        filters.push({ field, operator, value })

        return {
            filter,
            all,
            paginate,
            sort,
            map,
            first
        }
    }

    function map(callback: Mapper<T>) {
        mappers.push(callback)

        return {
            filter,
            all,
            paginate,
            sort,
            map,
            first
        }
    }

    function sort(field: string, order: 'ASC' | 'DESC') {
        sortValue = { field, order }

        return {
            filter,
            all,
            paginate,
            sort,
            map,
            first
        }
    }

    async function all() {
        return handler({ filters, sort: sortValue, mappers, mode: 'all' })
    }

    async function first() {
        return handler({ filters, sort: sortValue, mappers, mode: 'first' })
    }

    async function paginate(page: number, perPage: number) {
        return handler({ filters, sort: sortValue, page, perPage, mappers, mode: 'paginate' })
    }

    return () => ({
        filter,
        sort,
        all,
        first,
        map,
        paginate
    })
}

export function applyMongoFilters(filters: Filter[]) {
    let query = {}

    function buildFilter(filter: Filter) {
        switch (filter.operator) {
            case '=':
                return filter.value;
            case 'like':
                return new RegExp('.*' + filter.value + '.*', 'i')
            case 'in':
                return {
                    '$in': filter.value
                }
            case 'all': // return true if all items is available in data.
                return {
                    '$all': filter.value
                }
            case '!=':
                return {
                    '$ne': filter.value
                }
            case '<':
                return {
                    '$lt': filter.value
                }
            case '<=':
                return {
                    '$lte': filter.value
                }
            case '>':
                return {
                    '$gt': filter.value
                }
            case '>=':
                return {
                    '$gte': filter.value
                }
            default:
                throw new Error('This case is not handled for filter of type: ' + filter.operator);
        }
    }

    for (const filter of filters) {
        if (typeof filter.field === 'string') {
            if(filter.field === 'id') filter.field = '_id'
            query[filter.field] = buildFilter(filter)
        } else if (Array.isArray(filter.field)) {
            for (let field of filter.field) {
                if(field === 'id') field = '_id'
                query[field] = buildFilter(filter);
            }
        }
    }

    return query
}

export function debounce(callback, timeout = 300) {
    let timer;
    return (...args) => {
        clearTimeout(timer)
        timer = setTimeout(() => {
            callback(...args)
        }, timeout)
    }
}

export function applyFilters(items, filters) {
    return filters.reduce((prev, curr) => {
        if (typeof curr.field === 'string') {
            return prev.filter((x) => applyComparison(x[curr.field], curr.operator, curr.value));
        } else if (Array.isArray(curr.field)) {
            for (let field of curr.field) {
                prev = prev.filter(x[field], curr.operator, curr.value)
            }
            return prev
        }
    }, items);
}

function applyComparison(value: any, operator: FilterOperator, compareValue: any) {
    if (!value) return false;
    switch (operator) {
        case '=':
            return value === compareValue;
        case 'like':
            return value.toLowerCase().indexOf(compareValue.toLowerCase()) >= 0
        case '!=':
            return value !== compareValue;
        case 'in':
            if (Array.isArray(value)) {
                const hasIntersection = compareValue.some((item: any) => value.includes(item));
                return hasIntersection
            } else {
                return (compareValue ?? []).includes(value);
            }
        case 'all':
            if (!Array.isArray(value) || value.length == 0) {
                return false
            }
            for (let item of compareValue) {
                if (!value?.includes(item)) {
                    return false
                }
            }
            return true
        case '<':
            return value < compareValue;
        case '<=':
            return value <= compareValue;
        case '>':
            return value > compareValue;
        case '>=':
            return value >= compareValue;
        // Add other conditions as needed
        default:
            throw new Error('This case is not handled for filter of type: ' + operator); // No comparison applied for unknown operators
    }
}
