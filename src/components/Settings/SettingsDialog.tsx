import React, {useCallback, useEffect, useState} from 'react';
import {LiteStorage} from 'utils';
import {registerBackHandler} from 'services/layout/backStack';
import Dialog, {DialogProps} from 'components/Dialog';
import Icon from 'components/Icon';
import TreeView, {TreeNode} from 'components/TreeView';
import useIsMobile from 'hooks/useIsMobile';
import './SettingsDialog.scss'; // Needs to be above the file below.
import useSettingsSources from './useSettingsSources';

export const storage = new LiteStorage('settings-sources');

type SettingsNode = TreeNode<React.ReactNode>;

export default function SettingsDialog(props: DialogProps) {
    const sources = useSettingsSources();
    const isMobile = useIsMobile();
    const [source, setSource] = useState<React.ReactNode>(null);
    // Mobile master-detail: which category is drilled into (always starts at the list).
    const [selected, setSelected] = useState<SettingsNode | null>(null);

    const back = useCallback(() => setSelected(null), []);

    // Mobile: hardware Back pops the drilled-in category before closing the dialog
    // (this entry stacks above the dialog's own — LIFO).
    useEffect(() => {
        if (isMobile && selected) {
            return registerBackHandler(back);
        }
    }, [isMobile, selected, back]);

    if (isMobile) {
        return (
            <Dialog {...props} className="settings-dialog" icon="settings" title="Settings">
                {selected ? (
                    <>
                        <button
                            type="button"
                            className="mobile-list-menu-back"
                            onClick={back}
                        >
                            <Icon name="left" />
                            <span className="mobile-list-menu-back-label">{selected.label}</span>
                        </button>
                        <div className="settings-dialog-source" key={selected.id}>
                            {selected.value}
                        </div>
                    </>
                ) : (
                    <ul className="mobile-list-menu">
                        {sources.map((node) => (
                            <React.Fragment key={node.id}>
                                <SettingsMobileItem node={node} onSelect={setSelected} />
                                {node.children?.map((child) => (
                                    <SettingsMobileItem
                                        key={child.id}
                                        node={child}
                                        child
                                        onSelect={setSelected}
                                    />
                                ))}
                            </React.Fragment>
                        ))}
                    </ul>
                )}
            </Dialog>
        );
    }

    return (
        <Dialog {...props} className="settings-dialog" icon="settings" title="Settings">
            <TreeView<React.ReactNode>
                className="settings-dialog-sources"
                roots={sources}
                storageId={storage.id}
                onSelect={setSource}
            />
            <div className="settings-dialog-source">{source}</div>
        </Dialog>
    );
}

interface SettingsMobileItemProps {
    node: SettingsNode;
    child?: boolean;
    onSelect: (node: SettingsNode) => void;
}

function SettingsMobileItem({node, child, onSelect}: SettingsMobileItemProps) {
    const handleClick = useCallback(() => onSelect(node), [node, onSelect]);

    return (
        <li className={`mobile-list-menu-item ${child ? 'indented' : ''}`}>
            <button type="button" onClick={handleClick}>
                <span className="mobile-list-menu-item-label">{node.label}</span>
                <Icon name="right" />
            </button>
        </li>
    );
}
