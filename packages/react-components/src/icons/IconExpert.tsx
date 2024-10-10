import React from 'react';

import { type IconProps } from './IconProps';

export const IconExpert = (props: IconProps): React.JSX.Element => (
    <svg
        onClick={e => props.onClick && props.onClick(e)}
        viewBox="0 0 486 486"
        width={props.width || (props.fontSize === 'small' ? 16 : 20)}
        height={props.height || props.width || (props.fontSize === 'small' ? 16 : 20)}
        xmlns="http://www.w3.org/2000/svg"
        className={props.className}
        style={props.style}
    >
        <path
            fill="currentColor"
            d="m414.928297,149.715165 c-2.639376,-57.222555 -35.669446,-106.505345 -83.345894,-132.039151 c-3.758948,-2.049842 -7.636885,-3.932022 -11.590542,-5.641125 c-19.303146,-8.394083 -40.607459,-13.050853 -63.004303,-13.050853 c-84.113909,0 -152.791790,65.703174 -157.718988,148.605566 l0.043268,-0.010816 v0.281245 c0,3.061243 -0.146031,16.750306 -0.146031,16.750306 l-2.352723,5.224668 h15.744315 c5.916964,-19.384275 24.078904,-32.635245 45.513024,-32.635245 c26.231510,0 47.573684,21.915481 47.573684,48.146991 c0,26.226103 -21.342174,47.146409 -47.573684,47.146409 c-25.111939,0 -45.734774,-19.735831 -47.443879,-44.658471 h-18.789334 c-0.400232,0 -0.778832,0.638209 -1.162839,0.584122 l-19.762875,55.199753 c-2.774590,7.696379 2.926030,16.214860 11.103771,16.214860 h17.020735 l-0.129805,87.899899 c0,17.356066 14.073071,31.174935 31.429136,31.174935 h56.205745 v82.648189 c0,12.877778 12.937273,22.580734 25.815051,22.580734 h144.597825 c12.877778,0 23.429877,-9.702955 23.429877,-22.580734 v-166.037352 c0,-22.645636 5.976457,-44.761234 16.561008,-64.789128 c11.055093,-20.925714 17.523731,-44.620611 18.129489,-69.792045 c0.027042,-1.260193 0.037858,-2.552839 0.037858,-3.845485 c0,-2.466302 -0.070310,-4.938014 -0.183890,-7.377273 zm-155.393308,-11.731165 h-13.456494 v13.559257 c0,4.732489 -4.267352,8.567157 -8.999842,8.567157 c-4.727079,0 -8.999842,-3.834667 -8.999842,-8.567157 v-13.559257 h-12.185483 c-4.732489,0 -8.567157,-4.267352 -8.567157,-8.999842 c0,-4.727079 3.834667,-8.999842 8.567157,-8.999842 h12.185483 v-12.077311 c0,-4.732489 4.272762,-8.567157 8.999842,-8.567157 c4.732489,0 8.999842,3.834667 8.999842,8.567157 v12.077311 h13.456494 c4.727079,0 8.567157,4.272762 8.567157,8.999842 c0,4.732489 -3.840077,8.999842 -8.567157,8.999842 zm0,0"
        />
        <path
            fill="currentColor"
            d="m187.695312 285.875c3.9375-3.980469 6.414063-9.449219 6.414063-15.523438 0-12.128906-9.855469-21.980468-21.984375-21.980468-6.007812 0-11.472656 2.410156-15.457031 6.347656-4.023438 4.003906-6.523438 9.539062-6.523438 15.636719 0 12.125 9.855469 21.980469 21.980469 21.980469 6.078125 0 11.585938-2.476563 15.570312-6.460938zm0 0"
        />
    </svg>
);
