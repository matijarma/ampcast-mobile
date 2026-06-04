export type PublicMediaServiceId =
    | 'apple'
    | 'internet-radio'
    | 'mixcloud'
    | 'soundcloud'
    | 'spotify'
    | 'tidal'
    | 'youtube';

export type PersonalMediaServiceId =
    | 'airsonic'
    | 'ampache'
    | 'emby'
    | 'gonic'
    | 'ibroadcast'
    | 'jellyfin'
    | 'navidrome'
    | 'plex'
    | 'subsonic';

export type ScrobblerId = 'lastfm' | 'listenbrainz';

export type DataServiceId = 'localdb' | 'downloads' | ScrobblerId;

type MediaServiceId = PublicMediaServiceId | PersonalMediaServiceId | DataServiceId;

export default MediaServiceId;
