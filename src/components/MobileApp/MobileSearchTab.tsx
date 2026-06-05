import React, {useCallback, useEffect, useState} from 'react';
import {map} from 'rxjs';
import Browsable from 'types/Browsable';
import MediaService from 'types/MediaService';
import {
    getBrowsableServices,
    isPersonalMediaService,
    observeMediaServices,
} from 'services/mediaServices';
import {
    isSourceVisible,
    observeVisibilityChanges,
} from 'services/mediaServices/servicesSettings';
import {registerBackHandler} from 'services/layout/backStack';
import {IconButton} from 'components/Button';
import Icon from 'components/Icon';
import MediaBrowser from 'components/MediaBrowser';
import MediaServiceLabel from 'components/MediaSources/MediaServiceLabel';

// Search tab: a service picker (every visible service with a searchable root) that
// drills into the service's ready-made search surface — the same <MediaBrowser/> the
// desktop renders for the service root (SearchBar + sub-source selector + results).
// Both panes stay mounted (display toggled) so the query and results survive going
// back to the picker; picking a different service remounts the browser (`key`).
export default function MobileSearchTab() {
    const services = useSearchableServices();
    const [service, setService] = useState<Browsable<MediaService> | null>(null);
    const [showBrowser, setShowBrowser] = useState(false);

    const handleSelect = useCallback((service: Browsable<MediaService>) => {
        setService((prevService) =>
            prevService?.id === service.id ? prevService : service
        );
        setShowBrowser(true);
    }, []);

    const back = useCallback(() => setShowBrowser(false), []);

    // Hardware Back pops the drilled-in search browser back to the service picker.
    useEffect(() => {
        if (showBrowser) {
            return registerBackHandler(back);
        }
    }, [showBrowser, back]);

    return (
        <div className="mobile-screen mobile-search-tab">
            <header className="mobile-screen-header">
                {showBrowser && service ? (
                    <>
                        <IconButton
                            icon="left"
                            className="mobile-back"
                            title="Back"
                            onClick={back}
                        />
                        <h1 className="mobile-screen-title">{service.name}</h1>
                    </>
                ) : (
                    <h1 className="mobile-screen-title">Search</h1>
                )}
            </header>
            <div className="mobile-screen-body">
                <div className="mobile-library-pane" hidden={showBrowser}>
                    <ul className="mobile-list-menu">
                        {services.map((service) => (
                            <SearchServiceItem
                                service={service}
                                onSelect={handleSelect}
                                key={service.id}
                            />
                        ))}
                    </ul>
                </div>
                {service ? (
                    <div className="mobile-library-pane" hidden={!showBrowser}>
                        <MediaBrowser
                            service={service}
                            source={service.root}
                            key={getServiceKey(service)}
                        />
                    </div>
                ) : null}
            </div>
        </div>
    );
}

interface SearchServiceItemProps {
    service: Browsable<MediaService>;
    onSelect: (service: Browsable<MediaService>) => void;
}

function SearchServiceItem({service, onSelect}: SearchServiceItemProps) {
    const handleClick = useCallback(() => onSelect(service), [service, onSelect]);

    return (
        <li className="mobile-list-menu-item">
            <button type="button" onClick={handleClick}>
                <span className="mobile-list-menu-item-label">
                    <MediaServiceLabel service={service} showConnectivity />
                </span>
                <Icon name="right" />
            </button>
        </li>
    );
}

function useSearchableServices(): readonly Browsable<MediaService>[] {
    const [services, setServices] = useState<readonly Browsable<MediaService>[]>([]);

    useEffect(() => {
        const subscription = observeMediaServices()
            .pipe(map(getSearchableServices))
            .subscribe(setServices);
        subscription.add(
            observeVisibilityChanges()
                .pipe(map(getSearchableServices))
                .subscribe(setServices)
        );
        return () => subscription.unsubscribe();
    }, []);

    return services;
}

function getSearchableServices(): readonly Browsable<MediaService>[] {
    return getBrowsableServices()
        .filter(isSourceVisible)
        .filter((service) => !!service.root.searchable);
}

function getServiceKey(service: Browsable<MediaService>): string {
    return isPersonalMediaService(service)
        ? `${service.id}/${service.libraryId || ''}`
        : service.id;
}
