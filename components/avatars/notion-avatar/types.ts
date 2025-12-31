export interface AvatarConfig {
    wrapperShape?: 'circle' | 'square' | 'squircle';
    background?: {
        color?: string;
    };
    widgets?: {
        ear?: { shape?: string; };
        eyes?: { shape?: string; };
        beard?: { shape?: string; };
        details?: { shape?: string; };
        eyebrows?: { shape?: string; };
        glasses?: { shape?: string; };
        hair?: { shape?: string; };
        mouth?: { shape?: string; };
        nose?: { shape?: string; };
        tops?: { shape?: string; };
    };
    // Map numerical values from our simplified config to these if needed
    // or just use this structure directly
    [key: string]: any;
}
