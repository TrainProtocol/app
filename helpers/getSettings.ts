import TrainApiClient from "../lib/trainApiClient";
import { getThemeData } from "./settingsHelper";

const apiClient = new TrainApiClient()

export async function getServerSideProps(context) {

    context.res.setHeader(
        'Cache-Control',
        's-maxage=60, stale-while-revalidate'
    );

    const networks = await apiClient.GetNetworksAsync()
    const routes = await apiClient.GetRoutesAsync();

    if (!networks.length) return

    const networksWithLogos = networks.map(network => ({
        ...network,
        logo: `https://raw.githubusercontent.com/TrainProtocol/icons/main/networks/${network.slug.toLowerCase().split('-')[0]}.png`,
    }))

    const filteredRoutes = routes?.filter(r => networksWithLogos.some(n => n.slug == r.source.network.slug) && networksWithLogos.some(n => n.slug == r.destination.network.slug)) || []

    const settings = {
        networks: networksWithLogos,
        routes: filteredRoutes
    }

    const themeData = await getThemeData(context.query)

    return {
        props: { settings, themeData }
    }
}