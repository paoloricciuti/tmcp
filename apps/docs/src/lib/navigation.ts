import { defineNavigation } from '@svecodocs/kit';
import ChalkboardTeacher from 'phosphor-svelte/lib/ChalkboardTeacher';
import RocketLaunch from 'phosphor-svelte/lib/RocketLaunch';
import Tag from 'phosphor-svelte/lib/Tag';
import { clean_slug, get_all_docs } from './utils.js';

const all_docs = get_all_docs();

const core = all_docs
	.filter((doc) => doc.section === 'Core')
	.map((doc) => ({
		title: doc.title,
		href: `/docs/${clean_slug(doc.slug)}`,
	}));

const utils = all_docs
	.filter((doc) => doc.section === 'Utils')
	.map((doc) => ({
		title: doc.title,
		href: `/docs/${clean_slug(doc.slug)}`,
	}));

const transports = all_docs
	.filter((doc) => doc.section === 'Transports')
	.map((doc) => ({
		title: doc.title,
		href: `/docs/${clean_slug(doc.slug)}`,
	}));

const session_managers = all_docs
	.filter((doc) => doc.section === 'Session Managers')
	.map((doc) => ({
		title: doc.title,
		href: `/docs/${clean_slug(doc.slug)}`,
	}));

const auth = all_docs
	.filter((doc) => doc.section === 'Auth')
	.map((doc) => ({
		title: doc.title,
		href: `/docs/${clean_slug(doc.slug)}`,
	}));

export const navigation = defineNavigation({
	anchors: [
		{
			title: 'Introduction',
			href: '/docs',
			icon: ChalkboardTeacher,
		},
		{
			title: 'Getting Started',
			href: '/docs/getting-started',
			icon: RocketLaunch,
		},
		{
			title: 'Releases',
			href: 'https://github.com/paoloricciuti/tmcp/releases',
			icon: Tag,
		},
	],
	sections: [
		{
			title: 'Core',
			items: core,
		},
		{
			title: 'Utils',
			items: utils,
		},
		{
			title: 'Transports',
			items: transports,
		},
		{
			title: 'Session Managers',
			items: session_managers,
		},
		{
			title: 'Auth',
			items: auth,
		},
	],
});
