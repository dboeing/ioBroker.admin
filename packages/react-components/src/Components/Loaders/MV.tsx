import React from 'react';
import type { ThemeType } from '../../types';

interface LogoProps {
    themeType?: ThemeType;
    size?: number;
    /** Background color */
    backgroundColor?: string;
    /** Background image URL */
    backgroundImage?: string;
}

/**
 * Vendor specific loader
 *
 * @param props Properties
 */
export function LoaderMV(props: LogoProps): React.JSX.Element {
    const themeType = props.themeType || 'light';
    const size = props.size || 300;

    return (
        <div
            style={{
                width: '100%',
                height: '100%',
                position: 'absolute',
                top: 0,
                left: 0,
                backgroundImage:
                    props.backgroundImage && props.backgroundImage !== '@@loginBackgroundImage@@'
                        ? props.backgroundImage
                        : window.loadingBackgroundImage && window.loadingBackgroundImage !== '@@loginBackgroundImage@@'
                          ? `url(${window.loadingBackgroundImage})`
                          : undefined,
                backgroundColor:
                    props.backgroundColor && props.backgroundColor !== '@@loginBackgroundColor@@'
                        ? props.backgroundColor
                        : window.loadingBackgroundColor && window.loadingBackgroundColor !== '@@loginBackgroundColor@@'
                          ? window.loadingBackgroundColor
                          : themeType === 'dark'
                            ? '#000'
                            : '#FFF',
                backgroundSize: 'cover',
            }}
        >
            <div
                style={{
                    width: size,
                    height: size,
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%,-50%)',
                    zIndex: 2,
                }}
            >
                <svg
                    viewBox="0 0 500 500"
                    xmlns="http://www.w3.org/2000/svg"
                    width="100%"
                    height="100%"
                >
                    <circle
                        strokeWidth="5"
                        fill="none"
                        stroke="#01BBF5"
                        cx="250"
                        cy="250"
                        r="200"
                    />
                    <circle
                        strokeWidth="5"
                        fill="none"
                        stroke="#01BBF5"
                        cx="250"
                        cy="250"
                        r="133"
                    />
                    <circle
                        strokeWidth="5"
                        fill="none"
                        stroke="#01BBF5"
                        cx="250"
                        cy="250"
                        r="83"
                    />
                    <circle
                        strokeWidth="5"
                        fill="none"
                        stroke="#01BBF5"
                        cx="250"
                        cy="250"
                        r="66"
                    />
                    <circle
                        strokeWidth="15"
                        fill="none"
                        stroke="#01BBF5"
                        cx="250"
                        cy="250"
                        r="15"
                    />
                    <g>
                        <line
                            y2="185"
                            x2="250"
                            y1="240"
                            x1="250"
                            strokeWidth="5"
                            stroke="#01BBF5"
                            fill="none"
                        />
                        <line
                            y2="315"
                            x2="250"
                            y1="260"
                            x1="250"
                            strokeWidth="5"
                            stroke="#01BBF5"
                            fill="none"
                        />
                        <g transform="rotate(60, 250, 250)">
                            <line
                                y2="185"
                                x2="250"
                                y1="240"
                                x1="250"
                                strokeWidth="5"
                                stroke="#01BBF5"
                                fill="none"
                            />
                            <line
                                y2="315"
                                x2="250"
                                y1="260"
                                x1="250"
                                strokeWidth="5"
                                stroke="#01BBF5"
                                fill="none"
                            />
                        </g>
                        <g transform="rotate(120, 250, 250)">
                            <line
                                y2="185"
                                x2="250"
                                y1="240"
                                x1="250"
                                strokeWidth="5"
                                stroke="#01BBF5"
                                fill="none"
                            />
                            <line
                                y2="315"
                                x2="250"
                                y1="260"
                                x1="250"
                                strokeWidth="5"
                                stroke="#01BBF5"
                                fill="none"
                            />
                        </g>
                        {[
                            0, 15, 30, 45, 60, 75, 90, 105, 120, 135, 150, 165, 180, 195, 210, 225, 240, 255, 270, 285,
                            300, 315, 330, 345,
                        ].map(angle => (
                            <line
                                key={angle}
                                transform={`rotate(${angle}, 250, 250)`}
                                y2="250"
                                x2="115"
                                y1="240"
                                x1="135"
                                strokeWidth="5"
                                stroke="#01BBF5"
                                fill="none"
                            />
                        ))}
                        <animateTransform
                            attributeType="xml"
                            attributeName="transform"
                            type="rotate"
                            from="0 250 250"
                            to="360 250 250"
                            dur="10s"
                            additive="sum"
                            repeatCount="indefinite"
                        />
                    </g>
                    <path
                        d="M 56.089 160.250 C 55.077 162.588, 46.037 182.950, 36 205.500 C 25.963 228.050, 16.923 248.412, 15.911 250.750 L 14.071 255 28.286 254.976 L 42.500 254.952 47.931 242.226 C 50.918 235.227, 54.366 227.250, 55.592 224.500 L 57.822 219.500 66.383 237.250 L 74.945 255 88.973 255 C 96.688 255, 103 254.841, 103 254.646 C 103 254.452, 100.043 248.071, 96.430 240.466 L 89.859 226.638 91.603 222.771 C 92.563 220.644, 93.660 218.710, 94.043 218.473 C 94.426 218.237, 108.609 246.609, 125.562 281.522 L 156.384 345 166.071 345 C 175.705 345, 175.763 344.985, 176.856 342.250 C 179.911 334.602, 208 260.765, 208 260.383 C 208 260.138, 202.546 260.065, 195.879 260.219 L 183.759 260.500 174.629 285.244 C 169.608 298.853, 165.254 309.990, 164.952 309.994 C 164.651 309.997, 148.901 277.389, 129.952 237.532 C 111.004 197.674, 95.275 165.057, 95 165.049 C 94.725 165.041, 90.685 172.415, 86.022 181.435 C 81.358 190.455, 77.308 197.689, 77.022 197.510 C 76.735 197.331, 72.675 187.920, 68 176.598 C 63.325 165.275, 59.147 156.008, 58.714 156.005 C 58.282 156.002, 57.101 157.912, 56.089 160.250 M 55.294 168.694 C 52.241 175.842, 52.166 176.323, 53.718 178.692 L 55.349 181.182 56.706 178.591 C 57.453 177.166, 58.406 176, 58.825 176 C 59.244 176, 60.777 178.363, 62.232 181.250 C 64.829 186.403, 64.879 186.440, 64.939 183.250 C 64.973 181.463, 65.422 180, 65.937 180 C 66.724 180, 60.176 162.824, 58.920 161.596 C 58.689 161.370, 57.057 164.564, 55.294 168.694 M 91.698 175.542 C 89.205 180.626, 89.099 181.308, 90.410 183.792 L 91.840 186.500 92.926 183.669 C 94.349 179.961, 96.024 180.653, 98.588 186.009 L 100.676 190.370 101.324 187.132 C 101.832 184.592, 101.217 182.395, 98.473 176.947 C 96.549 173.126, 94.849 170, 94.696 170 C 94.542 170, 93.193 172.494, 91.698 175.542 M 157.005 192.607 C 143.168 197.636, 134.999 209.202, 135.001 223.761 C 135.002 232.756, 138.710 240.755, 145.856 247.180 C 152.159 252.848, 158.121 255, 167.518 255 C 173.509 255, 175.684 254.499, 180.811 251.936 C 200.823 241.936, 205.088 216.155, 189.337 200.403 C 181.479 192.546, 166.868 189.022, 157.005 192.607 M 206 223 L 206 255 215.472 255 L 224.944 255 225.222 241.419 L 225.500 227.837 230.500 234.660 C 233.250 238.412, 238.002 244.636, 241.060 248.491 L 246.620 255.500 253.810 255.168 L 261 254.836 261 222.918 L 261 191 251.528 191 L 242.056 191 241.778 204.552 L 241.500 218.104 231.111 204.552 L 220.722 191 213.361 191 L 206 191 206 223 M 285.821 192.331 C 276.229 195.045, 270.010 202.130, 270.004 210.349 C 269.995 221.957, 275.913 226.925, 295.801 232.006 C 300.753 233.271, 302.228 235.609, 299.412 237.730 C 296.739 239.746, 288.369 238.774, 281.563 235.657 L 276.132 233.171 272.469 239.320 C 268.119 246.621, 268.341 247.287, 276.524 251.500 C 281.399 254.010, 283.761 254.556, 290.977 254.842 C 302.365 255.294, 307.420 253.846, 312.603 248.649 C 317.383 243.855, 319.463 236.989, 318.043 230.693 C 316.210 222.562, 311.258 218.610, 297.878 214.599 C 288.025 211.645, 285.443 209.631, 288.538 207.315 C 291.104 205.394, 302.270 205.946, 306.769 208.217 L 310.039 209.866 313.104 203.794 C 316.516 197.035, 316.622 197.304, 309.167 193.844 C 303.663 191.289, 292.140 190.542, 285.821 192.331 M 322 199 L 322 207 330 207 L 338 207 338 231 L 338 255 347.500 255 L 357 255 357 231.044 L 357 207.088 364.250 206.794 L 371.500 206.500 371.792 198.750 L 372.084 191 347.042 191 L 322 191 322 199 M 379 223 L 379 255 401 255 L 423 255 423 247.500 L 423 240 409.500 240 L 396 240 396 235 L 396 230 407.500 230 L 419 230 419 222 L 419 214 407.500 214 L 396 214 396 210.529 L 396 207.058 409.250 206.779 L 422.500 206.500 422.792 198.750 L 423.084 191 401.042 191 L 379 191 379 223 M 433 223 L 433 255 442 255 L 451 255 451 247 L 451 239 454.800 239 C 458.555 239, 458.645 239.092, 462.469 246.937 L 466.339 254.874 476.172 255.187 C 481.580 255.359, 486.003 255.111, 486.002 254.636 C 486.001 254.160, 483.277 249.264, 479.949 243.754 C 473.914 233.765, 473.903 233.732, 475.836 231.619 C 480.222 226.824, 482.359 220.791, 482.431 213 C 482.512 204.192, 480.272 198.822, 475.031 195.260 C 469.795 191.703, 465.527 191.012, 448.750 191.006 L 433 191 433 223 M 448.210 213.250 L 448.500 221.500 455.338 221.500 C 461.319 221.500, 462.417 221.204, 464.088 219.139 C 465.995 216.785, 466.556 212.613, 465.379 209.545 C 464.356 206.879, 459.449 205, 453.509 205 L 447.919 205 448.210 213.250 M 163.169 209.017 C 156.337 210.583, 151.176 218.533, 152.339 225.701 C 154.672 240.077, 175.040 242.355, 180.446 228.844 C 184.978 217.516, 175.176 206.267, 163.169 209.017 M 216.676 271.715 C 216.037 272.750, 188 344.021, 188 344.612 C 188 344.863, 192.811 344.940, 198.691 344.784 L 209.381 344.500 211.894 336.750 L 214.406 329 226.550 329 L 238.694 329 242.097 336.992 L 245.500 344.983 255.250 344.992 C 262.399 344.998, 264.994 344.667, 264.979 343.750 C 264.968 343.063, 258.477 326.525, 250.555 307 L 236.150 271.500 226.656 271.215 C 221.434 271.058, 216.943 271.283, 216.676 271.715 M 273 307 C 273 326.800, 272.887 343.337, 272.750 343.750 C 272.613 344.163, 277.102 344.628, 282.727 344.785 L 292.954 345.069 293.227 327.379 L 293.500 309.689 307 327.336 L 320.500 344.982 328.262 344.991 L 336.025 345 335.762 308.250 L 335.500 271.500 326.750 271.211 L 318 270.922 317.882 286.711 C 317.816 295.395, 317.816 302.837, 317.882 303.250 C 317.947 303.663, 317.808 304, 317.574 304 C 317.340 304, 310.809 296.575, 303.060 287.500 L 288.971 271 280.985 271 L 273 271 273 307 M 223.254 303.048 L 220.078 312 226.539 312 C 230.093 312, 233 311.861, 233 311.691 C 233 311.257, 226.886 294.553, 226.636 294.302 C 226.522 294.189, 225.001 298.125, 223.254 303.048"
                        stroke="none"
                        fill={props.themeType === 'dark' ? '#EEE' : '#111'}
                        fillRule="evenodd"
                    />
                </svg>
            </div>
        </div>
    );
}
