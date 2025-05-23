import LayerSwapApiClient from "../lib/layerSwapApiClient";
import { getThemeData } from "./settingsHelper";

export async function getServerSideProps(context) {

    context.res.setHeader(
        'Cache-Control',
        's-maxage=60, stale-while-revalidate'
    );

    const apiClient = new LayerSwapApiClient()

    const { data: networkData } = await apiClient.GetLSNetworksAsync()
    const { data: sourceRoutes } = await apiClient.GetLSNetworksAsync()
    const { data: destinationRoutes } = await apiClient.GetLSNetworksAsync()

    if (!networkData) return

    const version = process.env.NEXT_PUBLIC_API_VERSION
    
    const settings = {
        networks: networkData,
        sourceRoutes: sourceRoutes || [],
        destinationRoutes: destinationRoutes || []
    }

    const themeData = await getThemeData(context.query)

    return {
        props: { settings, themeData }
    }
}