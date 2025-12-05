import LayerSwapApiClient from "../lib/trainApiClient";
import { getThemeData } from "./settingsHelper";

export async function getServerSideProps(context) {

    context.res.setHeader(
        'Cache-Control',
        's-maxage=60, stale-while-revalidate'
    );

    const apiClient = new LayerSwapApiClient()

    const networks = await apiClient.GetLSNetworksAsync()
    const routes = await apiClient.GetRoutesAsync();

    if (!networks.length) return

    const isTestnet = process.env.NEXT_PUBLIC_API_VERSION == 'sandbox'

    const networksWithLogos = networks.filter(n => isTestnet ? n.isTestnet : !n.isTestnet).map(network => {
        return {
            ...network,
            logo: network.logo || `https://raw.githubusercontent.com/TrainProtocol/icons/main/networks/${network.name.toLowerCase().split('_')[0]}.png`,
        }
    })

    const filteredRoutes = routes?.filter(r => networksWithLogos.some(n => n.name == r.source.network.name) && networksWithLogos.some(n => n.name == r.destination.network.name)) || []

    const settings = {
        networks: networksWithLogos,
        routes: filteredRoutes
    }

    const themeData = await getThemeData(context.query)

    return {
        props: { settings, themeData }
    }
}