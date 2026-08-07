// Landing Page Types
export interface InfoLdg {
  title: string
  description: string
  image?: string
  video?: string
  list: {
    title: string
    description: string
    icon: string
  }[]
}

export interface FeatureLdg {
  title: string
  description: string
  link: string
  icon: string
}

// Site Config Types
export interface SiteConfig {
  name: string
  description: string
  url: string
  ogImage: string
  links: {
    twitter: string
    github: string
  }
  mailSupport: string
}

export interface SidebarNavItem {
  title: string
  items: {
    title: string
    href: string
  }[]
}
