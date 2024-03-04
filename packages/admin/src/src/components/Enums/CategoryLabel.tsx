import React from 'react';
import { useDrop } from 'react-dnd';

import {
    Tooltip,
    IconButton,
} from '@mui/material';

import {
    Edit as EditIcon,
    Delete as DeleteIcon,
} from '@mui/icons-material';

import { Utils } from '@iobroker/adapter-react-v5';

interface CategoryLabelProps {
    categoryData: Record<string, any>;
    showEnumEditDialog: (category: Record<string, any>, isNew: boolean) => void;
    showEnumDeleteDialog: (category: Record<string, any>) => void;
    classes: Record<string, any>;
    t: (text: string) => string;
    lang: string;
    themeType: string;
}

const CategoryLabel = (props: CategoryLabelProps) => {
    const [, drop] = useDrop(() => ({
        accept: ['enum'],
        drop: () => ({ enumId: props.categoryData._id }),
        collect: monitor => ({
            isOver: monitor.isOver(),
            canDrop: monitor.canDrop(),
        }),
    }));

    const textColor = Utils.getInvertedColor(props.categoryData.common.color, props.themeType, true);

    return <span ref={drop} className={props.classes.categoryTitle} style={{ color: textColor }}>
        {props.categoryData.common.icon ? <span
            className={props.classes.icon}
            style={{ backgroundImage: `url(${props.categoryData.common.icon})` }}
        /> : null}
        {typeof props.categoryData.common.name === 'string' ? props.categoryData.common.name : (props.categoryData.common.name[props.lang] || props.categoryData.common.name.en)}
        <IconButton
            size="small"
            style={{ color: textColor }}
            onClick={() => { props.showEnumEditDialog(props.categoryData, false); }}
        >
            <Tooltip title={props.t('Edit')} placement="top">
                <EditIcon />
            </Tooltip>
        </IconButton>
        {props.categoryData.common.dontDelete ? null : <IconButton
            size="small"
            style={{ color: textColor }}
            onClick={() => { props.showEnumDeleteDialog(props.categoryData); }}
        >
            <Tooltip title={props.t('Delete')} placement="top">
                <DeleteIcon />
            </Tooltip>
        </IconButton> }
    </span>;
};

export default CategoryLabel;
