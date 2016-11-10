import * as express from 'express';
import apiRouter from './api';
import homeRouter from './home';

var router = express.Router();

router.use('/', homeRouter);
router.use('/api', apiRouter);

export default router;