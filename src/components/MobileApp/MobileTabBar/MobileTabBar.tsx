import React from 'react';
import Icon, {IconName} from 'components/Icon';
import {MobileTab} from '../useMobileNav';
import './MobileTabBar.scss';

const tabs: ReadonlyArray<{id: MobileTab; label: string; icon: IconName}> = [
    {id: 'library', label: 'Library', icon: 'album'},
    {id: 'search', label: 'Search', icon: 'search'},
    {id: 'queue', label: 'Queue', icon: 'playlist'},
];

export interface MobileTabBarProps {
    activeTab: MobileTab;
    onSelect: (tab: MobileTab) => void;
}

export default function MobileTabBar({activeTab, onSelect}: MobileTabBarProps) {
    return (
        <nav className="mobile-tab-bar">
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    type="button"
                    className={`mobile-tab ${activeTab === tab.id ? 'active' : ''}`}
                    aria-current={activeTab === tab.id}
                    onClick={() => onSelect(tab.id)}
                >
                    <Icon name={tab.icon} />
                    <span className="mobile-tab-label">{tab.label}</span>
                </button>
            ))}
        </nav>
    );
}
