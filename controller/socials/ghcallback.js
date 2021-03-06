/* eslint-disable no-unused-vars */
module.exports = {
  get: (req, res) => {
    const axios = require('axios');
    axios.defaults.withCredentials = true;
    const { user } = require('../../models');
    const jwt = require('jsonwebtoken');

    const clientID = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;

    const code = req.query.code;

    axios({
      method: 'post',
      url: `https://github.com/login/oauth/access_token?client_id=${clientID}&client_secret=${clientSecret}&code=${code}`,
      headers: {
        accept: 'application/json',
      },
    })
      .then((response) => {
        if (response === undefined) {
          return res.status(401).send({ status: 'Access failed' });
        }
        const accessToken = response.data.access_token;
        axios
          .get('https://api.github.com/user', {
            headers: {
              Authorization: `token ${accessToken}`,
            },
          })
          .then((result) => {
            if (
              !result.data ||
              result.data.login === undefined ||
              result.data.login.length === 0
            ) {
              return res.status(401).send({ status: 'Access failed' });
            }
            if (result.data) {
              const { data } = result;
              const username = data.login;
              const email = `github.com@${username}`; // 깃허브 주소로 이메일 대체
              const password = data.node_id;

              const grantAccessToken = (status, location) => {
                const userInfo = {
                  account: email,
                  gmt: Date().split(' ')[5],
                };
                const secret = process.env.ACCESS_SECRET + Date().split(' ')[2];
                const options = {
                  expiresIn: '1d',
                  issuer: 'devlogServer',
                  subject: 'userInfo',
                };
                jwt.sign(userInfo, secret, options, function (err, token) {
                  if (err) console.log(err);
                  else {
                    req.session.userId = token;
                    return res.status(status).redirect(location);
                  }
                });
              };

              user
                .findOrCreate({
                  where: {
                    email: email,
                  },
                  defaults: {
                    username: username,
                    password: password,
                    token: 'N/A',
                  },
                })
                .then(([data, created]) => {
                  if (created) {
                    grantAccessToken(301, '/socials/registered');
                    // return res.status(301).redirect(`/socials/registered`);
                  } else {
                    user
                      .update(
                        {
                          token: 'N/A',
                          updatedAt: new Date(),
                        },
                        {
                          where: {
                            email: email,
                          },
                        }
                      )
                      .then((result) => {
                        if (result[0] !== 0) {
                          console.log('Date updated');
                        } else console.log('Date update error');
                      })
                      .catch((err) => {
                        res.status(500).send(err);
                      });
                    grantAccessToken(301, '/socials/existing');
                    // return res.status(301).redirect(`/socials/existing`);
                  }
                })
                .catch((err) => {
                  res.status(500).send(err);
                });
            }
          })
          .catch((err) => {
            res.status(404).send(err);
          });
      })
      .catch((err) => {
        res.status(404).send(err);
      });
  },
};
