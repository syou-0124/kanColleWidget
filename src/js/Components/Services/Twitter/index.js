import _config from './twitter-config.json';

// ChromeExOAuth is installed by "manifest.json"
// import ChromeExOAuth from '../../../../../oauth/chrome_ex_oauth';

class HTTPCachely {
  constructor(namespace) {
    this.namespace = namespace;
  }
  get(key) {
    try {
      let entity = JSON.parse(localStorage.getItem(this.namespace) || '{}')[key];
      if (!entity) return;
      if (entity.expire < Date.now()) return;
      return entity.value;
    } catch (err) {
      return;
    }
  }
  set(key, value) {
    let store = JSON.parse(localStorage.getItem(this.namespace) || '{}');
    store[key] = {
      expire: Date.now() + (60 * 60 * 1000),
      value,
    };
    localStorage.setItem(this.namespace, JSON.stringify(store));
  }
  flush() {
    localStorage.removeItem(this.namespace);
  }
}

class Twitter {

  static _instance = null;
  static sharedInstance() {
    if (!this._instance) {
      this._instance = this.init();
    }
    return this._instance;
  }
  static init(config = _config) {
    var oauth = ChromeExOAuth.initBackgroundPage(config);
    return new this(oauth);
  }

  constructor(oauth /* ChromeExOAuth */) {
    this.oauth = oauth;
    this.cache = new HTTPCachely('cache_twitter');
  }

  auth(refresh = false) {
    if (refresh) this.clearTokens();
    return new Promise((resolve, reject) => {
      // ChromeExOAuth.authorizeは、プロジェクトルートのchrome_ex_oauth.htmlを開きます
      // TODO: chrome_ex_oauth.htmlをdest/oauth以下に移動できないだろうか
      // TODO: chrome_ex_oauth.htmlをもうちょっとかわいくしたいんだよな
      this.oauth.authorize((/* token, secret */) => {
        resolve(/* {token, secret} */);
      })
    })
  }

  clearTokens() {
    this.oauth.clearTokens();
    this.cache.flush();
  }

  getProfile() {
    var url = "https://api.twitter.com/1.1/account/verify_credentials.json";
    return this.request("GET", url);
  }

  request(method, url, data) {
    if (method == "GET") {
      let cached = this.cache.get(url);
      if (cached !== undefined) return Promise.resolve(cached);
    }
    return new Promise((resolve, reject) => {
      if (!this.oauth.hasToken()) return reject();
      this.oauth.sendSignedRequest(
        url,
        (res) => {
          try {
            let data = JSON.parse(res);
            if (data.errors && data.errors.length) return reject();
            if (method == "GET") this.cache.set(url, data);
            resolve(data);
          } catch (err) { reject(err); }
        },
        {method, method}
      );
    })
  }
}

export default Twitter;
