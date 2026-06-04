import DataService from 'types/DataService';
import MediaServiceId from 'types/MediaServiceId';
import ServiceType from 'types/ServiceType';
import noAuth from 'services/mediaServices/noAuth';
import {downloadedTracks} from './downloadsSources';

const serviceId: MediaServiceId = 'downloads';

// Locally downloaded music (see ./downloads.ts). Browsable and playable while offline
// or disconnected from the originating media server.
const downloads: DataService = {
    ...noAuth(true),
    id: serviceId,
    name: 'Downloads',
    icon: serviceId,
    url: '',
    serviceType: ServiceType.DataService,
    root: downloadedTracks,
    compareForRating: () => false,
};

export default downloads;
