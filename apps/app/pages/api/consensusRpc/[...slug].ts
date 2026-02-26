import axios from 'axios';
import { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const slug = req.query.slug && (req.query.slug as string[]).join('/');

    const queryParams = {}
    for (const key in req.query) {
        if (key !== 'slug') {
            queryParams[key] = req.query[key]
        }
    }

    const searchParams = new URLSearchParams(queryParams);

    const version = process.env.NEXT_PUBLIC_API_VERSION
    const rpcRes = await axios.get(`http://unstable.${version === 'sandbox' ? 'sepolia' : 'mainnet'}.beacon-api.nimbus.team/${slug}${searchParams ? `?${searchParams.toString()}` : ''}`)
    
    if (!rpcRes) {
        res.status(400).json({ error: { message: "Failed" } })
        return
    } else if (rpcRes) {
        res.status(200).json(rpcRes.data)
        return
    }

    else {
        res.status(500)
    }
}