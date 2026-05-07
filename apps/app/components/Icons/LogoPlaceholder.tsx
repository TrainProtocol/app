import React, { SVGProps } from 'react';

const LogoPlaceholder = ({ className, ...props }: SVGProps<SVGSVGElement>) => (
    <svg {...props} className={`text-primary-text-tertiary ${className ?? ''}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
        <path d="M8 11.7143L11 16.2952L15.5 8L22 21H2L8 11.7143Z" fill="currentColor" />
        <circle cx="9" cy="6" r="3" fill="currentColor" />
    </svg>
);

export default LogoPlaceholder;