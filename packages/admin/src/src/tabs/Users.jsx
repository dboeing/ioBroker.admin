import { Component } from 'react';
import PropTypes from 'prop-types';

import UsersList from '../components/Users/UsersList';

import TabContainer from '../components/TabContainer';
import TabContent from '../components/TabContent';

class Users extends Component {
    render() {
        return <TabContainer>
            <TabContent style={{ display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
                <UsersList {...this.props} />
            </TabContent>
        </TabContainer>;
    }
}

Users.propTypes = {
    t: PropTypes.func,
    lang: PropTypes.string,
    socket: PropTypes.object,
    ready: PropTypes.bool,
    expertMode: PropTypes.bool,
    themeType: PropTypes.string,
};

export default Users;
