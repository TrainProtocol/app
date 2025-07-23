import { ParsedUrlQuery } from "querystring";
import { QueryParams } from "../Models/QueryParams";


export const resolvePersistantQueryParams = (query: ParsedUrlQuery): ParsedUrlQuery | null => {
    if (!query)
        return null
    const persiatantParams = new QueryParams()
    const res: ParsedUrlQuery = {}
    Object.keys(persiatantParams).forEach(key => {
        if (query[key] !== undefined) {
            res[key] = query[key]
        }
    })
    return res
}