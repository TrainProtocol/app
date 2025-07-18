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

    if (!networks) return

    const networksWithLogos = networks.map(network => {
        return {
            ...network,
            logo: network.logo || `https://raw.githubusercontent.com/TrainProtocol/icons/main/networks/${network.name.toLowerCase().split('_')[0]}.png`,
        }
    })
    const settings = {
        networks: networksWithLogos,
        routes
    }

    const themeData = await getThemeData(context.query)

    return {
        props: { settings, themeData }
    }
}