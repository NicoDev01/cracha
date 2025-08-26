import React from 'react';

// Inline SVG React components to avoid base64 encoding issues during static generation

const GridIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M5.5 3.25C4.25736 3.25 3.25 4.25736 3.25 5.5V8.99998C3.25 10.2426 4.25736 11.25 5.5 11.25H9C10.2426 11.25 11.25 10.2426 11.25 8.99998V5.5C11.25 4.25736 10.2426 3.25 9 3.25H5.5ZM4.75 5.5C4.75 5.08579 5.08579 4.75 5.5 4.75H9C9.41421 4.75 9.75 5.08579 9.75 5.5V8.99998C9.75 9.41419 9.41421 9.74998 9 9.74998H5.5C5.08579 9.74998 4.75 9.41419 4.75 8.99998V5.5ZM5.5 12.75C4.25736 12.75 3.25 13.7574 3.25 15V18.5C3.25 19.7426 4.25736 20.75 5.5 20.75H9C10.2426 20.75 11.25 19.7427 11.25 18.5V15C11.25 13.7574 10.2426 12.75 9 12.75H5.5ZM4.75 15C4.75 14.5858 5.08579 14.25 5.5 14.25H9C9.41421 14.25 9.75 14.5858 9.75 15V18.5C9.75 18.9142 9.41421 19.25 9 19.25H5.5C5.08579 19.25 4.75 18.9142 4.75 18.5V15ZM12.75 5.5C12.75 4.25736 13.7574 3.25 15 3.25H18.5C19.7426 3.25 20.75 4.25736 20.75 5.5V8.99998C20.75 10.2426 19.7426 11.25 18.5 11.25H15C13.7574 11.25 12.75 10.2426 12.75 8.99998V5.5ZM15 4.75C14.5858 4.75 14.25 5.08579 14.25 5.5V8.99998C14.25 9.41419 14.5858 9.74998 15 9.74998H18.5C18.9142 9.74998 19.25 9.41419 19.25 8.99998V5.5C19.25 5.08579 18.9142 4.75 18.5 4.75H15ZM15 12.75C13.7574 12.75 12.75 13.7574 12.75 15V18.5C12.75 19.7426 13.7574 20.75 15 20.75H18.5C19.7426 20.75 20.75 19.7427 20.75 18.5V15C20.75 13.7574 19.7426 12.75 18.5 12.75H15ZM14.25 15C14.25 14.5858 14.5858 14.25 15 14.25H18.5C18.9142 14.25 19.25 14.5858 19.25 15V18.5C19.25 18.9142 18.9142 19.25 18.5 19.25H15C14.5858 19.25 14.25 18.9142 14.25 18.5V15Z"
      fill="currentColor"
    />
  </svg>
);

const ChevronDownIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M6 9L12 15L18 9"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const HorizontaLDots = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <circle cx="5" cy="12" r="2" fill="currentColor" />
    <circle cx="12" cy="12" r="2" fill="currentColor" />
    <circle cx="19" cy="12" r="2" fill="currentColor" />
  </svg>
);

const ChatIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M8 12H16M8 8H16M8 16H13M7 20L3 20C3 20 3 20 3 20C3 19.4477 3.44772 19 4 19H5V18C5 15.7909 6.79086 14 9 14H15C17.2091 14 19 15.7909 19 18V19H20C20.5523 19 21 19.4477 21 20C21 20 21 20 21 20L17 20L12 23L7 20Z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const FolderIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M3 7V17C3 18.1046 3.89543 19 5 19H19C20.1046 19 21 18.1046 21 17V9C21 7.89543 20.1046 7 19 7H12L10 5H5C3.89543 5 3 5.89543 3 7Z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const TableIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <rect
      x="3"
      y="3"
      width="18"
      height="18"
      rx="2"
      ry="2"
      stroke="currentColor"
      strokeWidth="2"
    />
    <line
      x1="9"
      y1="9"
      x2="21"
      y2="9"
      stroke="currentColor"
      strokeWidth="2"
    />
    <line
      x1="9"
      y1="15"
      x2="21"
      y2="15"
      stroke="currentColor"
      strokeWidth="2"
    />
    <line
      x1="15"
      y1="9"
      x2="15"
      y2="21"
      stroke="currentColor"
      strokeWidth="2"
    />
  </svg>
);

// Placeholder components for other icons to maintain compatibility
const PlaceholderIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <rect
      x="3"
      y="3"
      width="18"
      height="18"
      rx="2"
      stroke="currentColor"
      strokeWidth="2"
    />
  </svg>
);

export {
  GridIcon,
  ChevronDownIcon,
  HorizontaLDots,
  ChatIcon,
  FolderIcon,
  TableIcon,
  // Using PlaceholderIcon for other icons to maintain compatibility
  PlaceholderIcon as DownloadIcon,
  PlaceholderIcon as BellIcon,
  PlaceholderIcon as MoreDotIcon,
  PlaceholderIcon as FileIcon,
  PlaceholderIcon as AudioIcon,
  PlaceholderIcon as VideoIcon,
  PlaceholderIcon as BoltIcon,
  PlaceholderIcon as PlusIcon,
  PlaceholderIcon as BoxIcon,
  PlaceholderIcon as CloseIcon,
  PlaceholderIcon as CheckCircleIcon,
  PlaceholderIcon as AlertIcon,
  PlaceholderIcon as InfoIcon,
  PlaceholderIcon as ErrorIcon,
  PlaceholderIcon as ArrowUpIcon,
  PlaceholderIcon as ArrowDownIcon,
  PlaceholderIcon as ArrowRightIcon,
  PlaceholderIcon as GroupIcon,
  PlaceholderIcon as BoxIconLine,
  PlaceholderIcon as ShootingStarIcon,
  PlaceholderIcon as DollarLineIcon,
  PlaceholderIcon as TrashBinIcon,
  PlaceholderIcon as AngleUpIcon,
  PlaceholderIcon as AngleDownIcon,
  PlaceholderIcon as PencilIcon,
  PlaceholderIcon as CheckLineIcon,
  PlaceholderIcon as CloseLineIcon,
  PlaceholderIcon as PaperPlaneIcon,
  PlaceholderIcon as EnvelopeIcon,
  PlaceholderIcon as LockIcon,
  PlaceholderIcon as UserIcon,
  PlaceholderIcon as CalenderIcon,
  PlaceholderIcon as EyeIcon,
  PlaceholderIcon as EyeCloseIcon,
  PlaceholderIcon as TimeIcon,
  PlaceholderIcon as CopyIcon,
  PlaceholderIcon as ChevronLeftIcon,
  PlaceholderIcon as UserCircleIcon,
  PlaceholderIcon as ListIcon,
  PlaceholderIcon as PageIcon,
  PlaceholderIcon as TaskIcon,
  PlaceholderIcon as PieChartIcon,
  PlaceholderIcon as BoxCubeIcon,
  PlaceholderIcon as PlugInIcon,
  PlaceholderIcon as DocsIcon,
  PlaceholderIcon as MailIcon,
  PlaceholderIcon as ChevronUpIcon,
};
