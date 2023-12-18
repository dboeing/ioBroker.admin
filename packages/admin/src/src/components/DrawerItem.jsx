import PropTypes from 'prop-types';

import { withStyles } from '@mui/styles';

import {
    Badge,
    Grid,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Tooltip,
    Checkbox,
} from '@mui/material';
import { DragHandle } from '@mui/icons-material';

import amber from '@mui/material/colors/amber';

import { Utils, ColorPicker } from '@iobroker/adapter-react-v5';
import CommonUtils from '../Utils';

const styles = theme => ({
    selected: {
        background: theme.palette.primary.main,
        color: theme.palette.mode === 'light' ? 'white' : CommonUtils.invertColor(theme.palette.primary.main, true),
        '&:hover': {
            color: theme.palette.primary.main,
            '& $selectedIcon': {
                color: theme.palette.primary.main,
            },
        },
    },
    selectedIcon: {
        color: theme.palette.mode === 'light' ? 'white' : CommonUtils.invertColor(theme.palette.primary.main, true),
    },
    compactBadge: {
        paddingLeft: 12,
    },
    noWrap: {
        flexWrap: 'nowrap',
        height: 40,
    },
    warn: {
        backgroundColor: amber[500],
    },
});

const DrawerItem = props => {
    const {
        badgeColor,
        badgeContent,
        classes,
        compact,
        icon,
        onClick,
        selected,
        text,
        editMenuList,
        visible,
        color,
        editListFunc,
        badgeAdditionalContent,
        badgeAdditionalColor,
        style,
    } = props;

    let content = text ? text.replace('&gt;', '>') : '';

    if (content === 'Text->Kommandos') {
        content = 'Text→Cmd';
    } else if (content === 'Text->Commands') {
        content = 'Text→Cmd';
    }

    return <div style={({ display: 'flex', alignItems: 'center', ...style || {} })}>
        {!!editMenuList && <DragHandle />}
        {!!editMenuList && <Checkbox checked={visible} onClick={() => editListFunc(true)} />}
        {!!editMenuList && <ColorPicker value={color} noInputField onChange={value => editListFunc(false, value || null)} />}
        <ListItemButton
            className={Utils.clsx(selected && classes.selected, compact && classes.compactBadge)}
            onClick={onClick}
        >
            <Tooltip title={compact ? content : ''}>
                <Grid
                    container
                    spacing={1}
                    alignItems="center"
                    className={classes.noWrap}
                >
                    <Grid item>
                        <ListItemIcon style={{ minWidth: 0, color }} classes={{ root: selected ? classes.selectedIcon : undefined }}>
                            <Badge
                                badgeContent={badgeContent || 0}
                                color={(badgeColor === 'warn' ? 'default' : badgeColor) || 'primary'}
                                classes={badgeColor === 'warn' ? { badge: classes.warn } : {}}
                            >
                                {icon}
                            </Badge>
                        </ListItemIcon>
                    </Grid>
                    {!compact &&
                        <Grid item>
                            <ListItemText style={{ color }}>
                                <Badge
                                    badgeContent={badgeAdditionalContent || 0}
                                    color={(badgeAdditionalColor === 'warn' ? 'default' : badgeAdditionalColor) || 'primary'}
                                    classes={badgeAdditionalColor === 'warn' ? { badge: classes.warn } : {}}
                                >
                                    {content}
                                </Badge>
                            </ListItemText>
                        </Grid>}
                </Grid>
            </Tooltip>
        </ListItemButton>
    </div>;
};

DrawerItem.propTypes = {
    icon: PropTypes.object,
    onClick: PropTypes.func,
    style: PropTypes.object,
    selected: PropTypes.bool,
    compact: PropTypes.bool,
    text: PropTypes.string,
    badgeContent: PropTypes.number,
    badgeColor: PropTypes.oneOf(['', 'default', 'primary', 'secondary', 'error', 'warn']),
    editMenuList: PropTypes.bool,
};

export default withStyles(styles)(DrawerItem);
