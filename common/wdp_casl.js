/*
@wdp  7.27 长安深蓝 积分兑换实物
完成大部分任务。一天几百积分吧，还没上架商城，听说大水？先撸
抓取域名 app-api.deepal.com.cn
可app抓包或者小程序抓包都行
变量 caslCookie  抓取账号请求头Authorization的值就可以
多账号@分割
一天1-2次吧。
[task_local]
#北京现代
58 0,9-22/4 * * * wdp_casl.js, tag=长安深蓝, enabled=true
定时：一天一两次
cron: 36 7,20 * * *
*/
const jsname = '长安深蓝'
const $ = Env('长安深蓝')
const logDebug = 0

const axios = require("axios");
//import axios from "axios";

const notifyFlag = 1; //0为关闭通知，1为打开通知,默认为1
const notify = $.isNode() ? require('./sendNotify') : '';
let notifyStr = ''

let httpResult //global buffer
let userUA = ($.isNode() ? process.env.gjzzUA : $.getdata('wbtcUA')) || 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 WUBA/10.26.5';
let userList = []


let userinfo='';
let token = '';//token

let caslTokenArr = [];
let caslToken = ($.isNode() ? process.env.caslCookie : $.getdata('caslCookie')) || '';
//let caslToken='' ;


let plArr = ['凡尔赛', '不错不错', '赞赞赞', '大多数人会希望你过好，但是前提条件是，不希望你过得比他好', '因你不同', '东风雪铁龙', '欣赏雪铁龙，加油棒棒哒', '66666', '加油，东风雪铁龙', '世界因你而存', '今生可爱与温柔，每一样都不能少', '远赴人间惊鸿宴，一睹人间盛世颜', '加油加油', 'upupUp', '东风雪铁龙，我的最爱', '赞赞赞'];
let imageArr = [];//图片资源

let disableStartTime = "" //以下时间段不做任务
let disableEndTime = "" //以下时间段不做任务
let curHour = (new Date()).getHours()

///////////////////////////////////////////////////////////////////

!(async () => {
    if (typeof $request !== "undefined") {
        await GetRewrite()
    } else {
        if (!(await Envs())) return
        console.log('====================\n')
        console.log(`\n=============================================    \n脚本执行 - 北京时间(UTC+8)：${new Date(
            new Date().getTime() + new Date().getTimezoneOffset() * 60 * 1000 +
            8 * 60 * 60 * 1000).toLocaleString()} \n=============================================\n`);
        console.log(`\n=================== 共找到 ${caslTokenArr.length} 个账号 ===================`)
        //随机诗词
        await poem();

        for (let index = 0; index < caslTokenArr.length; index++) {

            // await $.wait(delay()); //  随机延时
            let num = index + 1
            console.log(`\n========= 开始【第 ${num} 个账号】=========\n`)
            console.log('\n======== 检查登录状态 ========')
            //登录
            token = caslTokenArr[index] ;
            await $.wait(2000);
            //查询钱包信息
            await wallet();
            //查询规则
            await viewRule();
            //浏览帖子和评论帖子 点赞 收藏   查询帖子列表分页
            await articlequery();
            await $.wait(2000);

            // await adhome();
            // await adshortcut();
            // await adactivity();
            //浏览活动和分享活动  参加活动咱不能完成   查询活动列表分页
            await activityquery();
            await $.wait(2000);

        }
        showmsg()
    }
})()
    .catch((e) => $.logErr(e))
    .finally(() => $.done())


/////---------------------------方法------------------------------------------------

//获取钱包信息
async function wallet() {
        let url = 'https://app-api.deepal.com.cn/appapi/v1/member/ms/wallet';
        let body = ''
        let urlObject = populateUrlObject(url, '', body)
        await httpRequest('get', urlObject)
        let result = httpResult;
        if (!result) return
        //console.log(JSON.stringify(result))
        if (result.code == 200) {
            console.log('用户信息查询成功')
            userinfo=result.data;
        } else {
            console.log('用户信息查询成功失败：' + result.message)
        }
}
//查看规则
async function viewRule(articleId) {
    var content = '加油'
    let url = 'https://app-api.deepal.com.cn/appapi/v1/member/ms/viewRule';
    let body = '';
    let urlObject = populateUrlObject(url, '', body)
    await httpRequest('get', urlObject)
    let result = httpResult;
    if (!result) return
    if (result.code == 200) {
        console.log('查看规则成功')
    } else {
        console.log('查看规则失败：' + result.message)
    }
}
//查询主题信息列表
async function articlequery() {
        let url = 'https://app-api.deepal.com.cn/appapi/v1/m_app/article/query';
        let body = {"body":{"isRecommend":"1"},"index":"1","size":"10","lastId":'0'};
        let urlObject = populateUrlObject(url, '', body)
        await httpRequest('post', urlObject)
        let result = httpResult;
        if (!result) return
        //console.log(JSON.stringify(result))
        if (result.code == 200) {
            console.log('查询主题信息列表成功')
            var tiezilist=result.data;
            for(let i=0;i<tiezilist.length;i++){
               var articleId= tiezilist[i].id;
                console.log(`【开始第${i+1}个主题帖子】`)

                //点赞
                await praises(articleId);
                await $.wait(5000);
                //浏览
                await viewarticle(articleId);
                await $.wait(5000);
                //收藏
                await like(articleId);
                await $.wait(5000);
                //评论
                await comment(articleId);
                await $.wait(50000);
            }

        } else {
            console.log('查询主题信息列表失败：' + result.message)
        }
}

//首页滑动条
async function adhome() {
    let url = 'https://app-api.deepal.com.cn/appapi/v1/m_app/ad/home';
    let body = '';
    let urlObject = populateUrlObject(url, '', body)
    await httpRequest('get', urlObject)
    let result = httpResult;
    if (!result) return
    if (result.code == 200) {
        console.log('首页滑动条成功')
    } else {
        console.log('首页滑动条失败：' + result.message)
    }
}
//首页小卡片
async function adshortcut() {
    let url = 'https://app-api.deepal.com.cn/appapi/v1/m_app/ad/shortcut';
    let body = '';
    let urlObject = populateUrlObject(url, '', body)
    await httpRequest('get', urlObject)
    let result = httpResult;
    if (!result) return
    if (result.code == 200) {
        console.log('首页小卡片成功')
    } else {
        console.log('首页小卡片失败：' + result.message)
    }
}
//首页ad--activity
async function adactivity() {
    let url = 'https://app-api.deepal.com.cn/appapi/v1/m_app/ad/activity';
    let body = '';
    let urlObject = populateUrlObject(url, '', body)
    await httpRequest('get', urlObject)
    let result = httpResult;
    if (!result) return
    if (result.code == 200) {
        console.log('首页ad--activity成功')
    } else {
        console.log('首页ad--activity失败：' + result.message)
    }
}

//查询活动信息列表
async function activityquery() {
    let url = 'https://app-api.deepal.com.cn/appapi/v1/m_app/activity/query';
    let body = {"body":{"lat":"0","lng":"0"},"index":"1","size":"10","lastId":"0"};
    let urlObject = populateUrlObject(url, '', body)
    await httpRequest('post', urlObject)
    let result = httpResult;
    if (!result) return
    //console.log(JSON.stringify(result))
    if (result.code == 200) {
        console.log('查询主题信息列表成功')
        var activitylist=result.data.activity;
        for(let i=0;i<activitylist.length;i++){
            var articleId= activitylist[i].body.id;
            console.log(`【开始第${i+1}个活动】`)
            //浏览
            await activityview(articleId);
            await $.wait(500);
            //分享
            await share(articleId);
            await $.wait(500);
        }

    } else {
        console.log('查询主题信息列表失败：' + result.message)
    }
}

//活动分享
async function share(articleId) {
    let url = 'https://app-api.deepal.com.cn/appapi/v1/m_app/activity/'+articleId+'/share';
    let body = '';
    let urlObject = populateUrlObject(url, '', body)
    await httpRequest('post', urlObject)
    let result = httpResult;
    if (!result) return
    if (result.code == 200) {
        console.log('活动分享成功')
    } else {
        console.log('活动分享失败：' + result.message)
    }
}
//活动浏览
async function activityview(articleId) {
    let url = 'https://app-api.deepal.com.cn/appapi/v1/m_app/activity/'+articleId;
    let body = '';
    let urlObject = populateUrlObject(url, '', body)
    await httpRequest('get', urlObject)
    let result = httpResult;
    if (!result) return
    if (result.code == 200) {
        console.log('活动浏览成功')
    } else {
        console.log('活动浏览失败：' + result.message)
    }
}

//评论主题
async function comment(articleId) {
        var  content='加油'
        let url = 'https://app-api.deepal.com.cn/appapi/v1/m_app/comment';
        let body = {"articleId":articleId,"memberName":"深蓝5374","memberFace":"","parentId":null,"content":content,"quote":"长安深蓝SL03定购指南-第二弹","authorType":1,"quoteMemberId":"1","quoteMemberName":"长安深蓝","quoteMemberFace":"https://files.deepal.com.cn/member/head-portrait/6c599d214601820c01dedcffcb2a3be2.jpg"};
        let urlObject = populateUrlObject(url, '', body)
        await httpRequest('post', urlObject)
        let result = httpResult;
        if (!result) return
        if (result.code == 200) {
            console.log('评论主题成功')
        } else {
            console.log('评论主题失败：' + result.message)
        }
}


//浏览主题
async function viewarticle(articleId) {
    var  content='加油'
    let url = 'https://app-api.deepal.com.cn/appapi/v1/m_app/article/'+articleId;
    let body = '';
    let urlObject = populateUrlObject(url, '', body)
    await httpRequest('get', urlObject)
    let result = httpResult;
    if (!result) return
    if (result.code == 200) {
        console.log('浏览主题成功')
    } else {
        console.log('浏览主题失败：' + result.message)
    }
}


//收藏主题
async function like(articleId) {
    let url = 'https://app-api.deepal.com.cn/appapi/v1/m_app/article/'+articleId+'/like';
    let body = '';
    let urlObject = populateUrlObject(url, '', body)
    await httpRequest('post', urlObject)
    let result = httpResult;
    if (!result) return
    if (result.code == 200) {
        console.log('收藏主题成功')
    } else {
        console.log('收藏主题失败：' + result.message)
    }
}
//点赞主题
async function praises(articleId) {
    let url = 'https://app-api.deepal.com.cn/appapi/v1/m_app/article/'+articleId+'/praises';
    let body = '';
    let urlObject = populateUrlObject(url, '', body)
    await httpRequest('post', urlObject)
    let result = httpResult;
    if (!result) return
    if (result.code == 200) {
        console.log('点赞主题成功')
    } else {
        console.log('点赞主题失败：' + result.message)
    }
}

///////////////////////////////////////////////////////////////////
/**
 * 获取随机诗词
 */
async function poem() {
    let urlObject = populateUrlObject('https://v1.jinrishici.com/all.json', '', '')
    await httpRequest('post', urlObject);
    let result = httpResult;
    var shici = result.content + '\n' + '————————《' + result.origin + '》' + result.author;
    return shici;
}

async function Envs() {
    if (caslToken) {
        if (caslToken.indexOf("@") != -1) {
            caslToken.split("@").forEach((item) => {
                caslTokenArr.push(item);
            });
        } else if (caslToken.indexOf("\n") != -1) {
            caslToken.split("\n").forEach((item) => {
                caslTokenArr.push(item);
            });
        } else {
            caslTokenArr.push(caslToken);
        }
    } else {
        log(`\n提示：未填写提现变量，不会执行自动提现`)
    }
    return true;
}

async function GetRewrite() {

}

function addNotifyStr(str, log = true) {
    if (log) {
        console.log(`${str}\n`)
    }
    notifyStr += `${str}\n`
}

//通知
async function showmsg() {
    if (!(notifyStr && curHour == 22 || notifyStr.includes('失败'))) return
    notifyBody = jsname + "运行通知\n\n" + notifyStr
    if (notifyFlag == 1) {
        $.msg(notifyBody);
        if ($.isNode()) {
            await notify.sendNotify($.name, notifyBody);
        }
    } else {
        console.log(notifyBody);
    }
}

////////////////////////////////////////////////////////////////////
function populateUrlObject(url, cookie, body = '') {
    let host = (url.split('//')[1]).split('/')[0]
    let urlObject = {
        url: url,
        headers: {
            'Host': host,
            'Connection': 'keep-alive',
            'Accept': 'application/json, text/javascript, */*; q=0.01',
            'User-Agent': 'Mozilla/5.0 (Linux; Android 9; Mi Note 3 Build/PKQ1.181007.001; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/86.0.4240.99 XWEB/4273 MMWEBSDK/20220604 Mobile Safari/537.36 MMWEBID/4710 MicroMessenger/8.0.24.2180(0x28001837) WeChat/arm64 Weixin NetType/WIFI Language/zh_CN ABI/arm64 MiniProgramEnv/android' ,
            'Accept-Language': 'zh-CN,zh-Hans;q=0.9',
            'Accept-Encoding': 'gzip,compress,br,deflate',
             accept:"application/json",
            "authorization":  token,
            charset:"utf-8",
            apptype:"mp",
            appid:"wx0c0217402bdf4059",
            "security-sign": "3c3049386af626e90d7479e5f6ffdd15|435a97ac-585a-4c56-b976-bfd1866a278d|1658806402133",
        },
    }
    if (body) urlObject.body = body
    return urlObject;
}

async function httpRequest(method, url) {
    httpResult = null
    //let data;
    url.headers['Content-Type'] = 'application/json;charset=UTF-8'
    // url.headers['RequestType'] = method;
    // url.headers['Content-Type'] = 'application/json; charset=UTF-8;'
    try {
        if (method == 'post') {
            //注意：post的headers不能写在请求体里面，在参数对象之前或之后都可以，再添加一个对象，然后声明headers;
            var {data} = await axios.post(url.url, url.body, {headers: url.headers})
        } else {
            //可以看到post和get有着明显的区别，headers和参数是写在同一个对象之内的。只不过在对象之内又分开成两个对象参数
            var {data} = await axios.get(url.url, url)
        }
    } catch (error) {
        console.log(error.message)
    }
    httpResult = data
}

// 随机延时1-30s，避免大家运行时间一样
function delay() {
    let time = parseInt(Math.random() * 100000);
    if (time > 30000) {// 大于30s重新生成
        return delay();
    } else {
        console.log('随机延时：', `${time}ms, 避免大家运行时间一样`)
        return time;// 小于30s，返回
    }
}

var Base64 = {
    _keyStr: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=", encode: function (e) {
        var t = "";
        var n, r, i, s, o, u, a;
        var f = 0;
        e = Base64._utf8_encode(e);
        while (f < e.length) {
            n = e.charCodeAt(f++);
            r = e.charCodeAt(f++);
            i = e.charCodeAt(f++);
            s = n >> 2;
            o = (n & 3) << 4 | r >> 4;
            u = (r & 15) << 2 | i >> 6;
            a = i & 63;
            if (isNaN(r)) {
                u = a = 64
            } else if (isNaN(i)) {
                a = 64
            }
            t = t + this._keyStr.charAt(s) + this._keyStr.charAt(o) + this._keyStr.charAt(u) + this._keyStr.charAt(a)
        }
        return t
    }, decode: function (e) {
        var t = "";
        var n, r, i;
        var s, o, u, a;
        var f = 0;
        e = e.replace(/[^A-Za-z0-9+/=]/g, "");
        while (f < e.length) {
            s = this._keyStr.indexOf(e.charAt(f++));
            o = this._keyStr.indexOf(e.charAt(f++));
            u = this._keyStr.indexOf(e.charAt(f++));
            a = this._keyStr.indexOf(e.charAt(f++));
            n = s << 2 | o >> 4;
            r = (o & 15) << 4 | u >> 2;
            i = (u & 3) << 6 | a;
            t = t + String.fromCharCode(n);
            if (u != 64) {
                t = t + String.fromCharCode(r)
            }
            if (a != 64) {
                t = t + String.fromCharCode(i)
            }
        }
        t = Base64._utf8_decode(t);
        return t
    }, _utf8_encode: function (e) {
        e = e.replace(/rn/g, "n");
        var t = "";
        for (var n = 0; n < e.length; n++) {
            var r = e.charCodeAt(n);
            if (r < 128) {
                t += String.fromCharCode(r)
            } else if (r > 127 && r < 2048) {
                t += String.fromCharCode(r >> 6 | 192);
                t += String.fromCharCode(r & 63 | 128)
            } else {
                t += String.fromCharCode(r >> 12 | 224);
                t += String.fromCharCode(r >> 6 & 63 | 128);
                t += String.fromCharCode(r & 63 | 128)
            }
        }
        return t
    }, _utf8_decode: function (e) {
        var t = "";
        var n = 0;
        var r = c1 = c2 = 0;
        while (n < e.length) {
            r = e.charCodeAt(n);
            if (r < 128) {
                t += String.fromCharCode(r);
                n++
            } else if (r > 191 && r < 224) {
                c2 = e.charCodeAt(n + 1);
                t += String.fromCharCode((r & 31) << 6 | c2 & 63);
                n += 2
            } else {
                c2 = e.charCodeAt(n + 1);
                c3 = e.charCodeAt(n + 2);
                t += String.fromCharCode((r & 15) << 12 | (c2 & 63) << 6 | c3 & 63);
                n += 3
            }
        }
        return t
    }
}

function MD5Encrypt(a) {
    function b(a, b) {
        return a << b | a >>> 32 - b
    }

    function c(a, b) {
        var c, d, e, f, g;
        return e = 2147483648 & a, f = 2147483648 & b, c = 1073741824 & a, d = 1073741824 & b, g = (1073741823 & a) + (1073741823 & b), c & d ? 2147483648 ^ g ^ e ^ f : c | d ? 1073741824 & g ? 3221225472 ^ g ^ e ^ f : 1073741824 ^ g ^ e ^ f : g ^ e ^ f
    }

    function d(a, b, c) {
        return a & b | ~a & c
    }

    function e(a, b, c) {
        return a & c | b & ~c
    }

    function f(a, b, c) {
        return a ^ b ^ c
    }

    function g(a, b, c) {
        return b ^ (a | ~c)
    }

    function h(a, e, f, g, h, i, j) {
        return a = c(a, c(c(d(e, f, g), h), j)), c(b(a, i), e)
    }

    function i(a, d, f, g, h, i, j) {
        return a = c(a, c(c(e(d, f, g), h), j)), c(b(a, i), d)
    }

    function j(a, d, e, g, h, i, j) {
        return a = c(a, c(c(f(d, e, g), h), j)), c(b(a, i), d)
    }

    function k(a, d, e, f, h, i, j) {
        return a = c(a, c(c(g(d, e, f), h), j)), c(b(a, i), d)
    }

    function l(a) {
        for (var b, c = a.length, d = c + 8, e = (d - d % 64) / 64, f = 16 * (e + 1), g = new Array(f - 1), h = 0, i = 0; c > i;) b = (i - i % 4) / 4, h = i % 4 * 8, g[b] = g[b] | a.charCodeAt(i) << h, i++;
        return b = (i - i % 4) / 4, h = i % 4 * 8, g[b] = g[b] | 128 << h, g[f - 2] = c << 3, g[f - 1] = c >>> 29, g
    }

    function m(a) {
        var b, c, d = "", e = "";
        for (c = 0; 3 >= c; c++) b = a >>> 8 * c & 255, e = "0" + b.toString(16), d += e.substr(e.length - 2, 2);
        return d
    }

    function n(a) {
        a = a.replace(/\r\n/g, "\n");
        for (var b = "", c = 0; c < a.length; c++) {
            var d = a.charCodeAt(c);
            128 > d ? b += String.fromCharCode(d) : d > 127 && 2048 > d ? (b += String.fromCharCode(d >> 6 | 192), b += String.fromCharCode(63 & d | 128)) : (b += String.fromCharCode(d >> 12 | 224), b += String.fromCharCode(d >> 6 & 63 | 128), b += String.fromCharCode(63 & d | 128))
        }
        return b
    }

    var o, p, q, r, s, t, u, v, w, x = [], y = 7, z = 12, A = 17, B = 22, C = 5, D = 9, E = 14, F = 20, G = 4, H = 11,
        I = 16, J = 23, K = 6, L = 10, M = 15, N = 21;
    for (a = n(a), x = l(a), t = 1732584193, u = 4023233417, v = 2562383102, w = 271733878, o = 0; o < x.length; o += 16) p = t, q = u, r = v, s = w, t = h(t, u, v, w, x[o + 0], y, 3614090360), w = h(w, t, u, v, x[o + 1], z, 3905402710), v = h(v, w, t, u, x[o + 2], A, 606105819), u = h(u, v, w, t, x[o + 3], B, 3250441966), t = h(t, u, v, w, x[o + 4], y, 4118548399), w = h(w, t, u, v, x[o + 5], z, 1200080426), v = h(v, w, t, u, x[o + 6], A, 2821735955), u = h(u, v, w, t, x[o + 7], B, 4249261313), t = h(t, u, v, w, x[o + 8], y, 1770035416), w = h(w, t, u, v, x[o + 9], z, 2336552879), v = h(v, w, t, u, x[o + 10], A, 4294925233), u = h(u, v, w, t, x[o + 11], B, 2304563134), t = h(t, u, v, w, x[o + 12], y, 1804603682), w = h(w, t, u, v, x[o + 13], z, 4254626195), v = h(v, w, t, u, x[o + 14], A, 2792965006), u = h(u, v, w, t, x[o + 15], B, 1236535329), t = i(t, u, v, w, x[o + 1], C, 4129170786), w = i(w, t, u, v, x[o + 6], D, 3225465664), v = i(v, w, t, u, x[o + 11], E, 643717713), u = i(u, v, w, t, x[o + 0], F, 3921069994), t = i(t, u, v, w, x[o + 5], C, 3593408605), w = i(w, t, u, v, x[o + 10], D, 38016083), v = i(v, w, t, u, x[o + 15], E, 3634488961), u = i(u, v, w, t, x[o + 4], F, 3889429448), t = i(t, u, v, w, x[o + 9], C, 568446438), w = i(w, t, u, v, x[o + 14], D, 3275163606), v = i(v, w, t, u, x[o + 3], E, 4107603335), u = i(u, v, w, t, x[o + 8], F, 1163531501), t = i(t, u, v, w, x[o + 13], C, 2850285829), w = i(w, t, u, v, x[o + 2], D, 4243563512), v = i(v, w, t, u, x[o + 7], E, 1735328473), u = i(u, v, w, t, x[o + 12], F, 2368359562), t = j(t, u, v, w, x[o + 5], G, 4294588738), w = j(w, t, u, v, x[o + 8], H, 2272392833), v = j(v, w, t, u, x[o + 11], I, 1839030562), u = j(u, v, w, t, x[o + 14], J, 4259657740), t = j(t, u, v, w, x[o + 1], G, 2763975236), w = j(w, t, u, v, x[o + 4], H, 1272893353), v = j(v, w, t, u, x[o + 7], I, 4139469664), u = j(u, v, w, t, x[o + 10], J, 3200236656), t = j(t, u, v, w, x[o + 13], G, 681279174), w = j(w, t, u, v, x[o + 0], H, 3936430074), v = j(v, w, t, u, x[o + 3], I, 3572445317), u = j(u, v, w, t, x[o + 6], J, 76029189), t = j(t, u, v, w, x[o + 9], G, 3654602809), w = j(w, t, u, v, x[o + 12], H, 3873151461), v = j(v, w, t, u, x[o + 15], I, 530742520), u = j(u, v, w, t, x[o + 2], J, 3299628645), t = k(t, u, v, w, x[o + 0], K, 4096336452), w = k(w, t, u, v, x[o + 7], L, 1126891415), v = k(v, w, t, u, x[o + 14], M, 2878612391), u = k(u, v, w, t, x[o + 5], N, 4237533241), t = k(t, u, v, w, x[o + 12], K, 1700485571), w = k(w, t, u, v, x[o + 3], L, 2399980690), v = k(v, w, t, u, x[o + 10], M, 4293915773), u = k(u, v, w, t, x[o + 1], N, 2240044497), t = k(t, u, v, w, x[o + 8], K, 1873313359), w = k(w, t, u, v, x[o + 15], L, 4264355552), v = k(v, w, t, u, x[o + 6], M, 2734768916), u = k(u, v, w, t, x[o + 13], N, 1309151649), t = k(t, u, v, w, x[o + 4], K, 4149444226), w = k(w, t, u, v, x[o + 11], L, 3174756917), v = k(v, w, t, u, x[o + 2], M, 718787259), u = k(u, v, w, t, x[o + 9], N, 3951481745), t = c(t, p), u = c(u, q), v = c(v, r), w = c(w, s);
    var O = m(t) + m(u) + m(v) + m(w);
    return O.toLowerCase()
}

function Env(t, e) {
    "undefined" != typeof process && JSON.stringify(process.env).indexOf("GITHUB") > -1 && process.exit(0);

    class s {
        constructor(t) {
            this.env = t
        }

        send(t, e = "GET") {
            t = "string" == typeof t ? {url: t} : t;
            let s = this.get;
            return "POST" === e && (s = this.post), "PUT" === e && (s = this.put), new Promise((e, i) => {
                s.call(this, t, (t, s, r) => {
                    t ? i(t) : e(s)
                })
            })
        }

        get(t) {
            return this.send.call(this.env, t)
        }

        post(t) {
            return this.send.call(this.env, t, "POST")
        }

        put(t) {
            return this.send.call(this.env, t, "PUT")
        }
    }

    return new class {
        constructor(t, e) {
            this.name = t, this.http = new s(this), this.data = null, this.dataFile = "box.dat", this.logs = [], this.isMute = !1, this.isNeedRewrite = !1, this.logSeparator = "\n", this.startTime = (new Date).getTime(), Object.assign(this, e), this.log("", `\ud83d\udd14${this.name}, \u5f00\u59cb!`)
        }

        isNode() {
            return "undefined" != typeof module && !!module.exports
        }

        isQuanX() {
            return "undefined" != typeof $task
        }

        isSurge() {
            return "undefined" != typeof $httpClient && "undefined" == typeof $loon
        }

        isLoon() {
            return "undefined" != typeof $loon
        }

        toObj(t, e = null) {
            try {
                return JSON.parse(t)
            } catch {
                return e
            }
        }

        toStr(t, e = null) {
            try {
                return JSON.stringify(t)
            } catch {
                return e
            }
        }

        getjson(t, e) {
            let s = e;
            const i = this.getdata(t);
            if (i) try {
                s = JSON.parse(this.getdata(t))
            } catch {
            }
            return s
        }

        setjson(t, e) {
            try {
                return this.setdata(JSON.stringify(t), e)
            } catch {
                return !1
            }
        }

        getScript(t) {
            return new Promise(e => {
                this.get({url: t}, (t, s, i) => e(i))
            })
        }

        runScript(t, e) {
            return new Promise(s => {
                let i = this.getdata("@chavy_boxjs_userCfgs.httpapi");
                i = i ? i.replace(/\n/g, "").trim() : i;
                let r = this.getdata("@chavy_boxjs_userCfgs.httpapi_timeout");
                r = r ? 1 * r : 20, r = e && e.timeout ? e.timeout : r;
                const [o, h] = i.split("@"), a = {
                    url: `http://${h}/v1/scripting/evaluate`,
                    body: {script_text: t, mock_type: "cron", timeout: r},
                    headers: {"X-Key": o, Accept: "*/*"}
                };
                this.post(a, (t, e, i) => s(i))
            }).catch(t => this.logErr(t))
        }

        loaddata() {
            if (!this.isNode()) return {};
            {
                this.fs = this.fs ? this.fs : require("fs"), this.path = this.path ? this.path : require("path");
                const t = this.path.resolve(this.dataFile), e = this.path.resolve(process.cwd(), this.dataFile),
                    s = this.fs.existsSync(t), i = !s && this.fs.existsSync(e);
                if (!s && !i) return {};
                {
                    const i = s ? t : e;
                    try {
                        return JSON.parse(this.fs.readFileSync(i))
                    } catch (t) {
                        return {}
                    }
                }
            }
        }

        writedata() {
            if (this.isNode()) {
                this.fs = this.fs ? this.fs : require("fs"), this.path = this.path ? this.path : require("path");
                const t = this.path.resolve(this.dataFile), e = this.path.resolve(process.cwd(), this.dataFile),
                    s = this.fs.existsSync(t), i = !s && this.fs.existsSync(e), r = JSON.stringify(this.data);
                s ? this.fs.writeFileSync(t, r) : i ? this.fs.writeFileSync(e, r) : this.fs.writeFileSync(t, r)
            }
        }

        lodash_get(t, e, s) {
            const i = e.replace(/\[(\d+)\]/g, ".$1").split(".");
            let r = t;
            for (const t of i) if (r = Object(r)[t], void 0 === r) return s;
            return r
        }

        lodash_set(t, e, s) {
            return Object(t) !== t ? t : (Array.isArray(e) || (e = e.toString().match(/[^.[\]]+/g) || []), e.slice(0, -1).reduce((t, s, i) => Object(t[s]) === t[s] ? t[s] : t[s] = Math.abs(e[i + 1]) >> 0 == +e[i + 1] ? [] : {}, t)[e[e.length - 1]] = s, t)
        }

        getdata(t) {
            let e = this.getval(t);
            if (/^@/.test(t)) {
                const [, s, i] = /^@(.*?)\.(.*?)$/.exec(t), r = s ? this.getval(s) : "";
                if (r) try {
                    const t = JSON.parse(r);
                    e = t ? this.lodash_get(t, i, "") : e
                } catch (t) {
                    e = ""
                }
            }
            return e
        }

        setdata(t, e) {
            let s = !1;
            if (/^@/.test(e)) {
                const [, i, r] = /^@(.*?)\.(.*?)$/.exec(e), o = this.getval(i),
                    h = i ? "null" === o ? null : o || "{}" : "{}";
                try {
                    const e = JSON.parse(h);
                    this.lodash_set(e, r, t), s = this.setval(JSON.stringify(e), i)
                } catch (e) {
                    const o = {};
                    this.lodash_set(o, r, t), s = this.setval(JSON.stringify(o), i)
                }
            } else s = this.setval(t, e);
            return s
        }

        getval(t) {
            return this.isSurge() || this.isLoon() ? $persistentStore.read(t) : this.isQuanX() ? $prefs.valueForKey(t) : this.isNode() ? (this.data = this.loaddata(), this.data[t]) : this.data && this.data[t] || null
        }

        setval(t, e) {
            return this.isSurge() || this.isLoon() ? $persistentStore.write(t, e) : this.isQuanX() ? $prefs.setValueForKey(t, e) : this.isNode() ? (this.data = this.loaddata(), this.data[e] = t, this.writedata(), !0) : this.data && this.data[e] || null
        }

        initGotEnv(t) {
            this.got = this.got ? this.got : require("got"), this.cktough = this.cktough ? this.cktough : require("tough-cookie"), this.ckjar = this.ckjar ? this.ckjar : new this.cktough.CookieJar, t && (t.headers = t.headers ? t.headers : {}, void 0 === t.headers.Cookie && void 0 === t.cookieJar && (t.cookieJar = this.ckjar))
        }

        get(t, e = (() => {
        })) {
            t.headers && (delete t.headers["Content-Type"], delete t.headers["Content-Length"]), this.isSurge() || this.isLoon() ? (this.isSurge() && this.isNeedRewrite && (t.headers = t.headers || {}, Object.assign(t.headers, {"X-Surge-Skip-Scripting": !1})), $httpClient.get(t, (t, s, i) => {
                !t && s && (s.body = i, s.statusCode = s.status), e(t, s, i)
            })) : this.isQuanX() ? (this.isNeedRewrite && (t.opts = t.opts || {}, Object.assign(t.opts, {hints: !1})), $task.fetch(t).then(t => {
                const {statusCode: s, statusCode: i, headers: r, body: o} = t;
                e(null, {status: s, statusCode: i, headers: r, body: o}, o)
            }, t => e(t))) : this.isNode() && (this.initGotEnv(t), this.got(t).on("redirect", (t, e) => {
                try {
                    if (t.headers["set-cookie"]) {
                        const s = t.headers["set-cookie"].map(this.cktough.Cookie.parse).toString();
                        this.ckjar.setCookieSync(s, null), e.cookieJar = this.ckjar
                    }
                } catch (t) {
                    this.logErr(t)
                }
            }).then(t => {
                const {statusCode: s, statusCode: i, headers: r, body: o} = t;
                e(null, {status: s, statusCode: i, headers: r, body: o}, o)
            }, t => {
                const {message: s, response: i} = t;
                e(s, i, i && i.body)
            }))
        }

        post(t, e = (() => {
        })) {
            if (t.body && t.headers && !t.headers["Content-Type"] && (t.headers["Content-Type"] = "application/x-www-form-urlencoded"), t.headers && delete t.headers["Content-Length"], this.isSurge() || this.isLoon()) this.isSurge() && this.isNeedRewrite && (t.headers = t.headers || {}, Object.assign(t.headers, {"X-Surge-Skip-Scripting": !1})), $httpClient.post(t, (t, s, i) => {
                !t && s && (s.body = i, s.statusCode = s.status), e(t, s, i)
            }); else if (this.isQuanX()) t.method = "POST", this.isNeedRewrite && (t.opts = t.opts || {}, Object.assign(t.opts, {hints: !1})), $task.fetch(t).then(t => {
                const {statusCode: s, statusCode: i, headers: r, body: o} = t;
                e(null, {status: s, statusCode: i, headers: r, body: o}, o)
            }, t => e(t)); else if (this.isNode()) {
                this.initGotEnv(t);
                const {url: s, ...i} = t;
                this.got.post(s, i).then(t => {
                    const {statusCode: s, statusCode: i, headers: r, body: o} = t;
                    e(null, {status: s, statusCode: i, headers: r, body: o}, o)
                }, t => {
                    const {message: s, response: i} = t;
                    e(s, i, i && i.body)
                })
            }
        }

        put(t, e = (() => {
        })) {
            if (t.body && t.headers && !t.headers["Content-Type"] && (t.headers["Content-Type"] = "application/x-www-form-urlencoded"), t.headers && delete t.headers["Content-Length"], this.isSurge() || this.isLoon()) this.isSurge() && this.isNeedRewrite && (t.headers = t.headers || {}, Object.assign(t.headers, {"X-Surge-Skip-Scripting": !1})), $httpClient.put(t, (t, s, i) => {
                !t && s && (s.body = i, s.statusCode = s.status), e(t, s, i)
            }); else if (this.isQuanX()) t.method = "PUT", this.isNeedRewrite && (t.opts = t.opts || {}, Object.assign(t.opts, {hints: !1})), $task.fetch(t).then(t => {
                const {statusCode: s, statusCode: i, headers: r, body: o} = t;
                e(null, {status: s, statusCode: i, headers: r, body: o}, o)
            }, t => e(t)); else if (this.isNode()) {
                this.initGotEnv(t);
                const {url: s, ...i} = t;
                this.got.put(s, i).then(t => {
                    const {statusCode: s, statusCode: i, headers: r, body: o} = t;
                    e(null, {status: s, statusCode: i, headers: r, body: o}, o)
                }, t => {
                    const {message: s, response: i} = t;
                    e(s, i, i && i.body)
                })
            }
        }

        time(t) {
            let e = {
                "M+": (new Date).getMonth() + 1,
                "d+": (new Date).getDate(),
                "H+": (new Date).getHours(),
                "m+": (new Date).getMinutes(),
                "s+": (new Date).getSeconds(),
                "q+": Math.floor(((new Date).getMonth() + 3) / 3),
                S: (new Date).getMilliseconds()
            };
            /(y+)/.test(t) && (t = t.replace(RegExp.$1, ((new Date).getFullYear() + "").substr(4 - RegExp.$1.length)));
            for (let s in e) new RegExp("(" + s + ")").test(t) && (t = t.replace(RegExp.$1, 1 == RegExp.$1.length ? e[s] : ("00" + e[s]).substr(("" + e[s]).length)));
            return t
        }

        msg(e = t, s = "", i = "", r) {
            const o = t => {
                if (!t) return t;
                if ("string" == typeof t) return this.isLoon() ? t : this.isQuanX() ? {"open-url": t} : this.isSurge() ? {url: t} : void 0;
                if ("object" == typeof t) {
                    if (this.isLoon()) {
                        let e = t.openUrl || t.url || t["open-url"], s = t.mediaUrl || t["media-url"];
                        return {openUrl: e, mediaUrl: s}
                    }
                    if (this.isQuanX()) {
                        let e = t["open-url"] || t.url || t.openUrl, s = t["media-url"] || t.mediaUrl;
                        return {"open-url": e, "media-url": s}
                    }
                    if (this.isSurge()) {
                        let e = t.url || t.openUrl || t["open-url"];
                        return {url: e}
                    }
                }
            };
            this.isMute || (this.isSurge() || this.isLoon() ? $notification.post(e, s, i, o(r)) : this.isQuanX() && $notify(e, s, i, o(r)));
            let h = ["", "==============\ud83d\udce3\u7cfb\u7edf\u901a\u77e5\ud83d\udce3=============="];
            h.push(e), s && h.push(s), i && h.push(i), console.log(h.join("\n")), this.logs = this.logs.concat(h)
        }

        log(...t) {
            t.length > 0 && (this.logs = [...this.logs, ...t]), console.log(t.join(this.logSeparator))
        }

        logErr(t, e) {
            const s = !this.isSurge() && !this.isQuanX() && !this.isLoon();
            s ? this.log("", `\u2757\ufe0f${this.name}, \u9519\u8bef!`, t.stack) : this.log("", `\u2757\ufe0f${this.name}, \u9519\u8bef!`, t)
        }

        wait(t) {
            return new Promise(e => setTimeout(e, t))
        }

        done(t = {}) {
            const e = (new Date).getTime(), s = (e - this.startTime) / 1e3;
            this.log("", `\ud83d\udd14${this.name}, \u7ed3\u675f! \ud83d\udd5b ${s} \u79d2`), this.log(), (this.isSurge() || this.isQuanX() || this.isLoon()) && $done(t)
        }
    }(t, e)
}