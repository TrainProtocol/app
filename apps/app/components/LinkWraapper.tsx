"use client"

import Link, { LinkProps } from "next/link";
import { useSearchParams } from "next/navigation";
import { FC } from "react";
import { getPersistantSearchParams } from "../helpers/querryHelper";

const LinkWrapper: FC<Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps> & LinkProps & {
    children?: React.ReactNode;
} & React.RefAttributes<HTMLAnchorElement>> = (props) => {
    const searchParams = useSearchParams();
    const { children } = props

    const pathname = typeof props.href === 'object' ? props.href.pathname : props.href
    const query = (typeof props.href === 'object' && typeof props.href.query === 'object' && props.href.query) || {}
    
    return (
        <Link
            {...props}
            href={{
                pathname: pathname,
                query: {
                    ...getPersistantSearchParams(searchParams),
                    ...query
                }
            }}
        >
            {children}
        </Link>
    )
}

export default LinkWrapper