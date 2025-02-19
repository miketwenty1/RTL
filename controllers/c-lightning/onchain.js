var request = require('request-promise');
var common = require('../../routes/common');
var logger = require('../shared/logger');
var options = {};

exports.getNewAddress = (req, res, next) => {
  logger.log({level: 'INFO', fileName: 'OnChain', msg: 'Generating New Address..'});
  options = common.getOptions();
  options.url = common.getSelLNServerUrl() + '/v1/newaddr?addrType=' + req.query.type;
  request(options).then((body) => {
    logger.log({level: 'INFO', fileName: 'OnChain', msg: 'New Address Generated'});
    res.status(200).json(body);
  })
  .catch(errRes => {
    const err = common.handleError(errRes,  'OnChain', 'New Address Error');
    return res.status(err.statusCode).json({message: err.message, error: err.error});
  });
};

exports.onChainWithdraw = (req, res, next) => {
  logger.log({level: 'INFO', fileName: 'OnChain', msg: 'Withdrawing from On Chain..'});
  options = common.getOptions();
  options.url = common.getSelLNServerUrl() + '/v1/withdraw';
  options.body = req.body;
  logger.log({level: 'DEBUG', fileName: 'OnChain', msg: 'OnChain Withdraw Options', data: options.body});
  request.post(options).then((body) => {
    logger.log({level: 'DEBUG', fileName: 'OnChain', msg: 'OnChain Withdraw Response', data: body});
    logger.log({level: 'INFO', fileName: 'OnChain', msg: 'Withdraw Finished'});
    res.status(201).json(body);
  })
  .catch(errRes => {
    const err = common.handleError(errRes,  'OnChain', 'Withdraw Error');
    return res.status(err.statusCode).json({message: err.message, error: err.error});
  });
}

exports.getUTXOs = (req, res, next) => {
  logger.log({level: 'INFO', fileName: 'OnChain', msg: 'List Funds..'});
  options = common.getOptions();
  options.url = common.getSelLNServerUrl() + '/v1/listFunds';
  request(options).then((body) => {
    if (body.outputs) { body.outputs = common.sortDescByStrKey(body.outputs, 'status'); }
    logger.log({level: 'DEBUG', fileName: 'OnChain', msg: 'List Funds Received', data: body});
    res.status(200).json(body);
  }).catch(errRes => {
    const err = common.handleError(errRes,  'OnChain', 'List Funds Error');
    return res.status(err.statusCode).json({message: err.message, error: err.error});
  });
};
