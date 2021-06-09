function _Sandbox() {
    this.cart = [];
    this.wishlist = [];
    this.items = [];
    this.filters = [];
    this.visitor_ip_address = '0.0.0.0';
    this.site_name = '';
    this.homepage_url = undefined;
    this.site_country = undefined;
    this.local_country = undefined;
    this.site_language = undefined;
    this.site_currency = undefined;
    this.local_currency = undefined;
    this.member_id = undefined;
    this.is_logged_in_user = undefined;
    this.user_has_subscription = undefined;
    this.store_id = undefined;
    this.sort_type = '';
    this.customs = {};
    this.search_query = '';
    this.result_set = 0;
    this.categories = [];

    // contextual variables
    this.contextuals = {
        shipping_method : '',
        shipping_price : undefined,
        zip_code : undefined,
        coupon : undefined,
        total_price : undefined,
    }

    // internal variables
    this.storage_prepend_str = 'sandbox_';
    this.api_url = 'https://api.sandbox.blackcrow.ai';
    this.events_url = this.api_url + '/v1/events/:event_name';
    // timeout is used to attempt to wait for contextual variables before firing navigation event.
    // should probably actually be router middleware that collects the information needed then sends the event but idk
    this.timeout_amount = 3000;
    this.timeout;
    this.previous_href;


    // prototypes -- wish I used typescript but its too late now :)
    this.Item = function(id, price, quantity, categories, on_sale, available, msrp, color, brand, size, subscription,
                   subscription_frequency, review_score, custom_1, custom_2, custom_3, custom_4, custom_5) {
        Object.assign(this, { id, price, quantity, categories, on_sale, available, msrp, color, brand, size, subscription,
            subscription_frequency, review_score, custom_1, custom_2, custom_3, custom_4, custom_5});
    }
    this.Filter = function(name, operator, value) {
        Object.assign(this, { name, operator, value});
    }

    // mini http library-ish thing for easier calls
    this.http = {
        post: (url, body, req_config = {}) => {
            let actualUrl = url;
            if (req_config.params && Object.keys(req_config.params).length) {
                actualUrl = url.concat('?', Object.keys(req_config.params).map((k) => k + '=' + req_config.params[k]).join('&'));
            }

            return new Promise((resolve, reject) => {
                fetch(actualUrl, {
                    method: 'POST',
                    body: JSON.stringify(body),
                    headers: {
                        'Content-type': 'application/json; charset=UTF-8'
                    }
                }).then(d => {
                    resolve(d.json());
                });
            });
        },
        get: (url, req_config = { params: {} }) => {
            let actualUrl = url;
            if (req_config.params && Object.keys(req_config.params).length) {
                actualUrl = url.concat('?', Object.keys(req_config.params).map(k => k + '=' + req_config.params[k]).join('&'));
            }

            return new Promise((resolve, reject) => {
                fetch(actualUrl).then(d => {
                    resolve(d.json())
                });
            });
        }
    };

    // helper functions
    this.get_page_id = () => {
        if (location.pathname === this.homepage_url) return 'home';
        return 'other';
    };

    this.generate_event = () => {
        return {
            site_name: this.site_name,
            page_id: this.get_page_id(),
            site_country: this.site_country || this.local_country,
            site_language: this.site_language,
            site_currency: this.site_currency || this.local_currency,
            page_title: document.title,
            page_url: location.href,
            page_referrer_url: document.referrer,
            history_id: history.state && history.state.navigationId,
            device_info: navigator.userAgent,
            visitor_ip_address: this.visitor_ip_address,
            visitor_id: localStorage.getItem(this.storage_prepend_str + this.site_name),
            member_id: this.member_id,
            is_logged_in_user: this.is_logged_in_user,
            user_has_subscription: this.user_has_subscription,
            store_id: this.store_id,
            // not really sure how to get these next 3.
            // I assume the parent website would actually have to capture the information from a search engine url and then feed it into the plugin?
            referrer_source: '',
            referrer_channel: '',
            referrer_query: '',
            cart: this.cart.filter(o => o),
            wishlist: this.wishlist.filter(o => o),
            wishlist_count: this.wishlist.length,
            items: this.items,
            filters: this.filters,
            sort_type: this.sort_type,
            search_query: this.search_query,
            result_set: this.result_set,
            categories: [],
            shipping_method: this.contextuals.shipping_method,
            shipping_price: this.contextuals.shipping_price,
            zip_code: this.contextuals.zip_code,
            coupon: this.contextuals.coupon,
            total_price: this.contextuals.total_price,
            event_id: localStorage.getItem(this.storage_prepend_str + this.site_name) + '_' + (+ new Date()).toString(),
            partner_controlled_experiments: [],
            custom_1: this.customs.custom_1,
            custom_2: this.customs.custom_2,
            custom_3: this.customs.custom_3,
            custom_4: this.customs.custom_4,
            custom_5: this.customs.custom_5,
            custom_6: this.customs.custom_6,
            custom_7: this.customs.custom_7,
            custom_8: this.customs.custom_8,
            custom_9: this.customs.custom_9,
            custom_10: this.customs.custom_10,
            custom_dimensions: {},
            traffic_groups: [],
        };
    }

    this.fire_event = (type) => {
        const e = Object.assign(this.generate_event(), this.contextuals);
        this.http.post(
            this.events_url.replace(':event_name', type),
            e,
        ).then((d) => {
            console.log('event sent :): %o', d);
        }).catch((e) => {
            // silently log error
            // sendToSentry(e)
        });
        // reset contextuals
        this.contextuals = {
            search_query : '',
            result_set : 0,
            categories : [],
            shipping_method : '',
            shipping_price : undefined,
            zip_code : undefined,
            coupon : undefined,
            total_price : undefined,
        }
    }

    this.fetch_and_set_traffic_groups = () => {
        this.http.get('https://hipsum.co/api/', { params: { type: 'hipster-centric', sentences: '1' }}).then((d) => {
            if (d && d.length) {
                this.categories = d.map(function(p) { return p[0].replace(',', '').replace(/\./g, '').split(' ') });
            }
        }).catch((e) => {
            // silently log error
            // sendToSentry(e)
        });
    }

    this.init =
        ({
            site_name,
            homepage_url,
            site_country,
            site_language,
            site_currency,
            member_id,
            is_logged_in_user,
            user_has_subscription,
            store_id,
            customs = {}
        }) => {
        Object.assign(this,
            {
                site_name,
                homepage_url,
                site_country,
                site_language,
                site_currency,
                member_id,
                is_logged_in_user,
                user_has_subscription,
                store_id,
                customs
            });

        if (member_id) localStorage.setItem(this.storage_prepend_str + site_name, member_id);

        // get ip/location data on initialize
        this.http.get('https://api.ipdata.co', { params: { 'api-key': '1ba07ed4876a47d8cc27e2ffe661bd2e1b77b508ba3c77e5d895ce39' }}).then((d) => {
            this.visitor_ip_address = d.ip;
            this.local_country = d.country_code;
            this.local_currency = d.currency&& d.currency.code;

            // set unique visitor id now that we have the IP
            if (!localStorage.getItem(this.storage_prepend_str + site_name)) {
                localStorage.setItem(this.storage_prepend_str + site_name, d.ip + (+ new Date()).toString());
            }
        }).catch((e) => {
            // silently log error
            // sendToSentry(e)
        });

        this.fetch_and_set_traffic_groups();

        // use mutationobserver to catch navigations
        // thanks https://stackoverflow.com/a/40418394
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (this.previous_href !== document.location.href) {
                    this.previous_href = document.location.href;

                    // cut timeout short and send event right away so we can send the next one
                    if (this.timeout && this.lambda) {
                        this.lambda();
                        clearTimeout(this.timeout);
                    }

                    this.lambda = this.fire_event.bind(this, 'view');
                    this.timeout = setTimeout(() => {
                        this.lambda();
                        this.lambda = undefined;
                    }, this.timeout_amount);
                }
            });
        });
        observer.observe(document.querySelector("body"), {
            childList: true,
            subtree: true
        });
    }

    this.add_to_cart =(item) => {
        this.cart.push(item)
    }

    this.remove_from_cart = (item) => {
        const index = this.cart.find(item);
        if (index !== -1) {
            this.cart[index] = undefined;
        }
    }

    this.add_to_wishlist = (item) => {
        this.wishlist.push(item)
    }

    this.remove_from_wishlist = (item) => {
        const index = this.wishlist.find(item);
        if (index !== -1) {
            this.wishlist[index] = undefined;
        }
    }

    this.set_items = (items) => {
        this.items = items;
    }

    this.set_filters = (filters) => {
        this.filters = filters;
    }

    this.checkout = (shipping_method, shipping_price, zip_code, coupon, total_price) => {
        Object.assign(this.contextuals, { shipping_method, shipping_price, zip_code, coupon, total_price });
        this.fire_event('purchase');
    }

    this.user_search = (search_query, result_set) => {
        this.search_query = search_query;
        this.result_set = result_set;
    }

    this.set_categories = (categories) => {
        this.categories = categories;
    }

    this.set_sort_type = (sorts) => {
        this.sort_type = sorts.join(',');
    }

}

const sandbox = new _Sandbox();
