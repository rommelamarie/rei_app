
import { Contact } from './types';

export const INITIAL_CONTACTS: Contact[] = [
  {
    id: 'rei-ai',
    name: 'REI AI',
    avatar: 'https://picsum.photos/seed/rei/200',
    lastMessage: 'How can I assist you today?',
    lastSeen: 'Online',
    isOnline: true,
    type: 'ai',
    category: 'bot'
  },
  {
    id: 'sarah-chen',
    name: 'Sarah Chen',
    avatar: 'https://picsum.photos/seed/sarah/200',
    lastMessage: 'The presentation looks great!',
    lastSeen: '2m ago',
    isOnline: true,
    type: 'human',
    category: 'direct'
  },
  {
    id: 'design-squad',
    name: 'Design Squad',
    avatar: 'https://picsum.photos/seed/group/200',
    lastMessage: 'Marcus: New icons are ready.',
    lastSeen: 'Active now',
    isOnline: true,
    type: 'human',
    category: 'group'
  },
  {
    id: 'alex-rivera',
    name: 'Alex Rivera',
    avatar: 'https://picsum.photos/seed/alex/200',
    lastMessage: 'Lunch at 1?',
    lastSeen: '1h ago',
    isOnline: false,
    type: 'human',
    category: 'direct'
  }
];

export const APP_NAME = 'REI APP';
