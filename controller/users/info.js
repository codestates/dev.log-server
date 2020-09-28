module.exports = {
  get: (req, res) => {
    const { user } = require('../../models');
    const jwt = require('jsonwebtoken');

    if (req.session.userId) {
      const token = req.session.userId;
      const decoded = jwt.verify(
        token,
        process.env.ACCESS_SECRET + Date().split(' ')[2]
      );
      const email = decoded.account;
      const location = decoded.location;
      if (req.hostname + req.ip === location) {
        user
          .findOne({
            raw: true,
            where: {
              email: email,
            },
            attributes: {
              exclude: ['password'],
            },
          })
          .then((data) => {
            if (data.token) {
              data.token = true;
            } else {
              data.token = false;
            }
            return res.status(200).json(data);
          })
          .catch((err) => {
            res.status(500).send(err);
          });
      } else {
        return res.status(403).json({ status: 'Access denied' });
      }
    } else {
      return res.status(401).json({ status: 'Access not authorized' });
    }
  },
};
