import * as expressSession from 'express-session';

export let sessionSettings = expressSession({
	cookie: {
		// Expire session 8 hours after last activity
		maxAge: 8 * 60 * 60 * 1000
	},
	name: 'sid',
	resave: false,
	rolling: true,
	saveUninitialized: true,
	secret: '2Pdkf87H8hS2g9JdO6Mz'
});