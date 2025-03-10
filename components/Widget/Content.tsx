type ContetProps = {
    center?: boolean,
    children?: JSX.Element | JSX.Element[];
    className?: string;
}
const Content = ({ children, center, className }: ContetProps) => {
    return center ?
        <div className='flex flex-col self-center grow w-full'>
            <div className='flex self-center grow w-full'>
                <div className='flex flex-col self-center w-full'>
                    {children}
                </div>
            </div>
        </div>
        : <div className={`space-y-4 py-3 ${className}`}>{children}</div>
}
export default Content