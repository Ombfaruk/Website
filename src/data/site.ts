export const bio = [
  "Hi, I'm Omar. I love making complex products feel simple and finding where people get stuck. I work solo as a growth-driven product designer for enterprise SaaS, web and mobile apps, and websites.",
  'Before I touch a product, I learn how your business works. Then I use behavioral design grounded in psychology to help more people get started and take action.',
  "I work remotely, but you'll feel like I'm your in-house designer. I join your daily meetings, share daily updates, and stay involved after launch.",
  'In short, I make complex products easier to use and easier to grow.',
];

export const experience = [
  {
    role: 'Freelance product designer',
    when: 'Sep 2025 to present',
    note: 'Remote work with startups across SaaS, AI, education, and food.',
  },
  {
    role: 'UX/UI designer, Jiak Technology',
    when: 'Sep 2024 to Aug 2025',
    note: 'Singapore, remote. Restaurant software for owners, waiters, and customers.',
  },
  {
    role: 'UX/UI designer, Roofer.com',
    when: 'Jul 2023 to Jun 2024',
    note: 'California, remote.',
  },
  {
    role: 'UX/UI designer, RoBenDevs',
    when: 'Feb 2022 to May 2023',
    note: 'Dhaka, hybrid.',
  },
  {
    role: 'UX/UI designer, Naturehub',
    when: 'Jul 2020 to Dec 2021',
    note: 'North Carolina, remote.',
  },
];

export const proof = [
  {
    kicker: 'Jiak',
    text: 'Merchant onboarding reached 43% across 4,300+ restaurants.',
  },
  {
    kicker: 'YNOW',
    text: 'In prototype tests, reviewers finished tasks 40% faster, and 95% agreed the new workflow solved their major coordination problems.',
  },
  {
    kicker: 'Habit flow',
    text: 'In a test with a few people, setup finished in under 1 minute, down from about 3 minutes, and the flow was twice as fast on average.',
  },
];

export type Service = {
  name: string;
  promise: string;
  summary: string;
  bestFor: string;
  gets: string[];
  steps: string[];
  price: string;
  timeline: string;
  proof: string;
};

export const services: Service[] = [
  {
    name: 'Web App Design & Redesign',
    promise: 'More adoption',
    summary: 'Enterprise teams often give every role the same crowded screens. I design clear SaaS and web apps that help each role make better decisions.',
    bestFor: 'Best for enterprise and B2B SaaS teams with complex workflows for approvals, dashboards, operations, or reporting.',
    gets: [
      'Workflows shaped around each role and what they need to do',
      'Full product design in Figma, from scratch or a redesign, including states and edge cases',
      'A design system the team can keep using',
      'Success metrics defined up front, and a developer ready handoff',
    ],
    steps: [
      'Learn the business, the users, the roles, and the goals',
      'Find where people get stuck or decisions slow down',
      'Design the workflows and screens around those needs',
      'Document the design and support the team while they build',
    ],
    price: 'From $4,000',
    timeline: 'A typical project takes 4 weeks',
    proof: 'On IBTE, setup time dropped 70%. At Jiak, merchant onboarding reached 43% across 4,300+ restaurants.',
  },
  {
    name: 'Mobile App Design & Redesign',
    promise: 'Retention',
    summary: 'I design apps people keep using. Flows are grounded in behavioral psychology and tied to activation, retention, and task completion. Habits should serve users, not trap them.',
    bestFor: 'Best for founders and teams building a new iOS or Android app, or improving an app people download and then leave.',
    gets: [
      'App flows built with the Hook Model: trigger, action, reward, investment',
      'Full UI in Figma, including every screen, state, and edge case',
      'Onboarding aimed at a first win, where many apps lose people in the first days',
      'A component library and a developer ready handoff',
    ],
    steps: [
      'Define the numbers to move, such as activation, day 7 and day 30 retention, and core task completion',
      'Find where and why people drop off, using Block, Interpret, Act, Store',
      'Design the UI, with each choice tied to a principle or a metric',
      'Document the specs and stay available while the team builds',
    ],
    price: 'From $2,000',
    timeline: 'A typical project takes 3 to 6 weeks',
    proof: 'At Jiak, the restaurant product reached a 43% merchant onboarding rate. At SuccessGroup, a rental platform reached 90% rental completion and 53% customer retention.',
  },
  {
    name: 'Website Design & Redesign',
    promise: 'More sign ups',
    summary: 'Founders often add more sections when a site is not converting. I look for friction between the page and the action you want, then design that path.',
    bestFor: 'Best for teams who want more sign ups from a marketing site, landing page, pricing page, or checkout.',
    gets: [
      'A page structure that leads visitors to one action',
      'A new site or a redesign of an existing one',
      'A journey that connects each message to the next step',
      'Conversion focused screens in Figma, and a developer ready handoff',
    ],
    steps: [
      'Learn the audience, the offer, the site, and the sign up goal',
      'Find where visitors lose clarity or stop',
      'Shape the pages around what people need to know and do',
      'Document the design and support the team while they build',
    ],
    price: 'From $1,200',
    timeline: 'A typical project takes 2 weeks',
    proof: 'While I worked on Jiak, menu to order conversion lifted 22%.',
  },
  {
    name: 'Onboarding Redesign',
    promise: 'Increase activation',
    summary: 'Most teams add more screens when onboarding feels slow. I look for where users lose their way, then redesign the path to first value.',
    bestFor: 'Best for SaaS, web, and mobile products where people sign up and do not reach a first win.',
    gets: [
      'A Loom walkthrough of the flow and where users may get lost',
      'A ranked list of friction, tied to named behavioral principles',
      'One Figma concept for one flow, from sign up to first value, with one revision',
    ],
    steps: [
      'Learn the product and the business',
      'Audit one flow from sign up to first value',
      'Redesign that flow as one concept, with one revision',
      'Walk you through the design and the reasons behind it',
    ],
    price: '$790',
    timeline: '1 week',
    proof: 'At Jiak, merchant onboarding reached 43% across 4,300+ restaurants. Send the product link and where users drop off, and I will send 3 friction notes before you book.',
  },
];

export const links = {
  email: 'collaborate.omar@gmail.com',
  linkedin: 'https://www.linkedin.com/in/designbyomarf/',
  dribbble: 'https://dribbble.com/designbyomar',
  portfolio: 'https://omar.figma.site',
};
