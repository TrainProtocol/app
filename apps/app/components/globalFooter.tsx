const GLobalFooter = () => {
    return (
        <footer className="z-30 hidden md:flex fixed bottom-0 left-[var(--sidebar-width)] py-4 justify-start items-center w-[calc(100%-var(--sidebar-width))] px-4 lg:px-8 mt-auto">
            <p className="text-xs text-primary-text-tertiary leading-6">
                &copy; {new Date().getFullYear()} Layerswap Labs, Inc. All rights reserved.
            </p>
        </footer>
    )
}

export default GLobalFooter
