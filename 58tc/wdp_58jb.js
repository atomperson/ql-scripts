/*
    58同城
    安卓貌似需要root才能捉到包，IOS随便捉
    多账号切换账号不能退出登录

    在环境变量中新增一下两个参数：
    ck变量（必填）：wbtcCookie
    值：PPU=UID=xxxx&UN=yyyy&...   多账号@隔开

    UA变量（选填）：wbtcUA
    值：浏览器User-Agent  不填默认IOS15的UA

    只做普通任务一天3毛左右，跑小游戏的话一天5毛到6毛
    账号能刷到新手奖励的话每天额外8毛4，前七天还有每天额外3毛(满5提现到矿石)，第一天做完新手任务就能提5块

    过引导：
        我的->神奇矿->装扮我的家，过了引导剧情，然后再跑脚本
        我的->提现->玩游戏领大奖-> 过合成房子引导

    游戏赚矿石里的三个小游戏需要投入矿石去赚更多，脚本默认跑小游戏

    注意：如果有手动验证没过的话。早上5-8点打卡将会失败，损失0.9元

    在wbtcCookie的对应账号后面加上#数字，例如：
        ck#1: '已绑定微信，已实名，可提现，可执行全部任务'
        ck#2: '已绑定微信，未实名，不可提现，可执行部分任务'
        ck#3: '未绑定微信，未实名，不可提现，可执行部分任务'

    每小时一次, 但是跑久了有可能触发滑块，需要自己去点一次，否则要被反撸矿石

    [Script]
    cron "10 0,6,8,11,14,17,19,21 * * *" script-path=kbg_58sjb.js, tag=58同城, enabled=true
*/
const axios = require("axios");
const jsname = '58同城';
const $ = Env('58同城');
const logDebug = 0;

const ckkey = 'wbtcCookie';

const notifyFlag = 0; //0为关闭通知，1为打开通知,默认为1
const notify = $.isNode() ? require('./sendNotify') : '';
let notifyStr = '';

let httpResult; //global buffer

let userCookie = ($.isNode() ? process.env[ckkey] : $.getdata(ckkey)) || '';

let userUA = ($.isNode() ? process.env.wbtcUA : $.getdata('wbtcUA')) || 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 WUBA/10.26.5';
let userList = [];

let doHomeContinueTaskNum = 1; // 首页签到再赚矿石任务最大次数

let userIdx = 0;
let userCount = 0;
let taskList = [1, 4, 5, 9, 20, 21];
let taskListInfo = {
    1: {
        name: '大富翁领体力',
        path: '提现->做游戏领大奖'
    },
    4: {
        name: '梦想小镇-房场景-首页任务',
        path: '提现->做游戏领大奖'
    },
    5: {
        name: '梦想小镇-车场景-首页任务',
        path: '提现->做游戏领大奖'
    },
    9: {
        name: '大富翁领体力',
        path: '提现->做游戏领大奖'
    },
    20: {
        name: '神奇矿鸡腿任务',
        path: '我的->神奇矿->免费领矿石'
    },
    21: {
        name: '神奇矿金币任务',
        path: '我的->神奇矿->免费领矿石'
    }
};
let TASK_TIME = [7, 24];
let WAIT_TASK10 = [6, 7, 20, 21]; // 运行间隔需要大于10s 的任务
let WAIT_TASK20 = [1, 4, 5, 9, 10]; // 运行间隔需要大于20s 的任务, 其中1879需要间隔25s
let WAIT_TASK25 = ['9-2191', '4-1866']; // 运行间隔需要大于25s 的任务
let WAIT_TASK15 = ['20-5581', '21-5583','20-5580','9-2684','4-5011']; // 运行间隔需要大于15s 的任务
let shields = ['13-2438', '4-2653', '4-2747', '4-5010', '4-5027', '9-5030', '9-5031', '20-2773', '20-5028', '20-5029','5-1916']; // 屏蔽任务
let attendType = {'oneDay':'一天打卡', 'multiDay':'三天打卡'};
let curHour = (new Date()).getHours();

let maxTaskLen = 0;
let maxRewardLen = 0;

let disableStartTime = ""; //以下时间段不做任务
let disableEndTime = ""; //以下时间段不做任务

///////////////////////////////////////////////////////////////////
class UserInfo {
    constructor(str) {
        let strArr = str.split('#');
        this.index = ++userIdx;
        this.nickName = '';
        this.cookie = strArr[0];
        this.login = false;
        this.cashSign = true;
        this.newbie = {};
        this.house = {};
        this.mining = {};
        this.auction = {};
        this.ore = {};
        this.task = [];
        this.reward = [];
        this.runTask = strArr[1] || 0;
        this.gainOre = 0; // 收取的矿石
        this.awardList = []; // 免费抽奖奖品列表
        this.maininfo = {}; // 梦想小镇详情
        this.showCar = false; // 是否展示过车等级信息
        this.showHouse = false; // 是否展示过房子等级信息
        this.mineMaininfo = null; // 神奇矿页面查询
        this.buyNum = 0;
        this.waitTime = 30000;
        this.followNum = 0;
        this.doHomeContinueTaskNum = 0; // 首页签到再赚矿石任务最大次数
        this.drumstickNum = 0; // 点击吃鸡腿最多4次
        this.recommendAtion = []; // 关注列表
        this.runTaskStrs = {
            1: '已绑定微信，已实名，可提现，可执行全部任务',
            2: '已绑定微信，未实名，不可提现，可执行部分任务',
            3: '未绑定微信，未实名，不可提现，可执行部分任务',
        };
        console.log(`账号[${this.index}]状态为：${this.runTaskStrs[this.runTask]}`);
    }

    // 查询登录状态
    async checkLogin() {
        let url = `https://lovely-house.58.com/sign/info`;
        let body = ``;
        let urlObject = populateUrlObject(url,this.cookie,body);
        await httpRequest('get',urlObject);
        let result = httpResult;
        if(!result) return;
        // console.log(JSON.stringify(result))
        if(result.code == 0) {
            this.login = true;
        } else {
            console.log(`账号[${this.index}]登录状态: ${result.message}`);
            this.login = !(result.message === '请登陆');
        }
    }

    // 查询现金签到状态
    async cashSigninlist() {
        let url = `https://tzbl.58.com/tzbl/taskcenter/signinlist?requestSource=1`;
        let body = ``;
        let urlObject = populateUrlObject(url,this.cookie,body);
        await httpRequest('get',urlObject);
        let result = httpResult;
        if(!result) return;
        //console.log(result)
        if(result.code == 0) {
            this.cashSign = result.data.signInVO.status==2 ? true : false;
            let cashStr = this.cashSign ? '未签到' : '已签到';
            addNotifyStr(`账号[${this.index}-${this.nickName}]今日现金签到页: ${cashStr}`);
        } else {
            addNotifyStr(`账号[${this.index}-${this.nickName}]查询现金签到失败: ${result.message}`);
        }
    }
    // 现金签到
    async cashSignin() {
        let url = `https://tzbl.58.com/tzbl/taskcenter/signin?requestSource=1`;
        let body = ``;
        let urlObject = populateUrlObject(url,this.cookie,body);
        await httpRequest('get',urlObject);
        let result = httpResult;
        if(!result) return;
        //console.log(result)
        if(result.code == 0) {
            addNotifyStr(`账号[${this.index}-${this.nickName}]现金签到获得${result.data.amount}元`);
        } else {
            addNotifyStr(`账号[${this.index}-${this.nickName}]查询现金签到失败: ${result.message}`);
        }
    }

    // 首页签到再赚矿石任务
    async doHomeContinueTask() {
        const signInfo = await this.homeSignInfo();
        await $.wait(300);
        if (signInfo && signInfo.continueOre > 0 && this.doHomeContinueTaskNum < doHomeContinueTaskNum) {
            const sceneId = 27;
            let taskList = await this.getTaskListv2(sceneId);
            // taskList.sort((a,b)=>{
            //     return b.taskWeight - a.taskWeight;
            // })
            // taskList = [taskList[0]]
            await $.wait(300);
            for(let i = 0; i < taskList.length; i++) {
                const item = taskList[i];
                await $.wait(25000);
                await this.doTask(sceneId, item.itemId);
                await $.wait(1000);
            }
            this.doHomeContinueTaskNum++;
            await this.doHomeContinueTask();
        }
    }

    // 新手任务详情查询
    async newbieMaininfo() {
        let url = `https://rightsplatform.58.com/web/motivate/maininfo`;
        let body = ``;
        let urlObject = populateUrlObject(url,this.cookie,body);
        await httpRequest('get',urlObject);
        let result = httpResult;
        if(!result) return;
        // console.log(JSON.stringify(result))
        if(result.code == 0) {
            this.newbie.coin = parseFloat(result.result.coin);
            this.newbie.isWithdraw = result.result.userWithdraw;
            if(result.result.todaySignDay<=7) {
                this.newbie.signItem = result.result.signInfo[result.result.todaySignDay-1];
                let signStr = (this.newbie.signItem.status==0) ? '未签到' : '已签到';
                console.log(`账号[${this.index}]今日新手任务${signStr}`);
                if(this.newbie.signItem.status == 0) {
                    await $.wait(500);
                    await this.newbieSign();
                }
            }
            console.log(`账号[${this.index}]新手金币余额：${this.newbie.coin}`);
            if(this.newbie.isWithdraw==false) {
                let sortList = result.result.withdrawInfo.sort(function(a,b) {return b.cardAmount-a.cardAmount;});
                for(let withItem of sortList) {
                    if(this.newbie.coin >= withItem.cardCoin) {
                        await $.wait(500);
                        await this.newbieWithdraw(withItem);
                    }
                }
            }
        } else {
            console.log(`账号[${this.index}]查询新手主页失败: ${result.message}`);
        }
    }
    // 新手任务签到
    async newbieSign() {
        let url = `https://rightsplatform.58.com/web/motivate/sign`;
        let body = ``;
        let urlObject = populateUrlObject(url,this.cookie,body);
        await httpRequest('post',urlObject);
        let result = httpResult;
        if(!result) return;
        //console.log(result)
        if(result.code == 0) {
            this.newbie.coin += parseFloat(this.newbie.signItem.signCoin);
            console.log(`账号[${this.index}]新手任务第${this.newbie.signItem.number}天签到成功，获得${this.newbie.signItem.signCoin}金币`);
        } else {
            console.log(`账号[${this.index}]新手任务签到失败: ${result.message}`);
        }
    }
    // 新手任务兑换
    async newbieWithdraw(withItem) {
        let url = `https://rightsplatform.58.com/web/motivate/withdraw`;
        let body = `id=${withItem.id}`;
        let urlObject = populateUrlObject(url,this.cookie,body);
        await httpRequest('post',urlObject);
        let result = httpResult;
        if(!result) return;
        //console.log(result)
        if(result.code == 0) {
            console.log(`账号[${this.index}]成功兑换${withItem.cardAmount}元到矿石余额`);
        } else {
            console.log(`账号[${this.index}]兑换${withItem.cardAmount}元到矿石余额失败: ${result.message}`);
        }
    }

    // 查询我的家签到状态
    async houseSignStatus() {
        let url = `https://lovely-house.58.com/sign/info`;
        let body = ``;
        let urlObject = populateUrlObject(url,this.cookie,body);
        await httpRequest('get',urlObject);
        let result = httpResult;
        if(!result) return;
        //console.log(result)
        if(result.code == 0) {
            for(let item of result.result) {
                if(item.today == true) {
                    let signStr = (item.sign==false) ? '未签到' : '已签到';
                    console.log(`账号[${this.index}]今日我的家${signStr}`);
                    if(item.sign == false) {
                        await $.wait(500);
                        await this.houseSign();
                    }
                    break;
                }
            }
        } else {
            console.log(`账号[${this.index}]查询我的家签到状态失败: ${result.message}`);
        }
    }
    // 我的家签到
    async houseSign() {
        let url = `https://lovely-house.58.com/sign/signin`;
        let body = ``;
        let urlObject = populateUrlObject(url,this.cookie,body);
        await httpRequest('post',urlObject);
        let result = httpResult;
        if(!result) return;
        //console.log(result)
        if(result.code == 0) {
            console.log(`账号[${this.index}]我的家签到成功，获得${result.result.gold}金币`);
        } else {
            console.log(`账号[${this.index}]我的家签到失败: ${result.message}`);
        }
    }

    // 神奇矿山-查询主页
    async miningUserInfo() {
        let url = `https://magicisland.58.com/web/mining/userInfo`;
        let body = ``;
        let urlObject = populateUrlObject(url,this.cookie,body);
        await httpRequest('get',urlObject);
        let result = httpResult;
        if(!result) return;
        //console.log(result)
        if(result.code == 0) {
            this.mining.enroll = result.result.status;
            let enrollStr = (this.mining.enroll==0) ? '未召唤小帮手' : '已召唤小帮手';
            console.log(`账号[${this.index}]神奇矿山${enrollStr}`);
            if(result.result.grantList && result.result.grantList.length > 0) {
                for (let i = 0; i < result.result.grantList.length; i++) {
                    await $.wait(500);
                    const res = await this.miningGain(result.result.grantList[i].id);
                    if (!res) break;
                }
                console.log(`账号[${this.index}]总共收取到${(this.gainOre.toFixed(2))}mg矿石，收益${(this.gainOre-5).toFixed(2)}mg矿石`);
                this.mining.enroll = 0;
            }
            if(this.runTask == 1 && this.mining.enroll==0) {
                if(parseFloat(result.result.usableOre) >= result.result.threshold) {
                    await $.wait(1500);
                    await this.miningEnroll();
                } else {
                    console.log(`账号[${this.index}]可用矿石余额${result.result.usableOre}不足，不能花费${result.result.threshold}矿石召唤小帮手`);
                }
            }
        } else {
            console.log(`账号[${this.index}]查询神奇矿山主页失败: ${result.message}`);
        }
    }
    // 神奇矿山-收取矿石
    async miningGain(id) {
        let url = `https://magicisland.58.com/web/mining/gain?id=${id}`;
        let body = ``;
        let urlObject = populateUrlObject(url,this.cookie,body);
        await httpRequest('get',urlObject);
        let result = httpResult;
        if(!result) return;
        //console.log(result)
        if(result.code == 0) {
            console.log(`账号[${this.index}]神奇矿山成功收取${result.result.gainOre}矿石`);
            this.gainOre+=Number(result.result.gainOre);
            return true;
        } else {
            addNotifyStr(`账号[${this.index}-${this.nickName}]神奇矿山收取矿石失败，需要手动过验证，请及时处理，23点过后将损失0.3元，活动路径：58同城app->我的->神奇矿->游戏赚矿石下面的神奇矿山，手动收取矿石`);
            // await notify.sendNotify($.name, `账号[${this.index}]神奇矿山收取矿石失败，需要手动过验证，路径：58同城app->我的->神奇矿->游戏赚矿石下面的神奇矿石，手动收取矿石` )
            return false;
        }
    }
    // 神奇矿山-召唤小帮手
    async miningEnroll() {
        let url = `https://magicisland.58.com/web/mining/enroll`;
        let body = ``;
        let urlObject = populateUrlObject(url,this.cookie,body);
        await httpRequest('get',urlObject);
        let result = httpResult;
        if(!result) return;
        // console.log(result)
        if(result.code == 0) {
            console.log(`账号[${this.index}]神奇矿山召唤小帮手成功`);
        } else {
            addNotifyStr(`账号[${this.index}-${this.nickName}]神奇矿山召唤小帮手失败: ${result.message}, 需手动召唤，否则每天少10mg（0.26元）收益，活动路径：58同城app->我的->神奇矿->游戏赚矿石下面的神奇矿山，手动召唤小帮手`);
        }
    }

    /////////////////////////////////////////////////











    // 查询任务列表
    async getTaskList(sceneId) {
        let url = `https://taskframe.58.com/web/task/dolist?sceneId=${sceneId}&openpush=0&source=`;
        let body = ``;
        let urlObject = populateUrlObject(url,this.cookie,body);
        await httpRequest('get',urlObject);
        let result = httpResult;
        if(!result) return;
        // console.log(JSON.stringify(result))
        if(result.code == 0) {
            if(!result.result.taskList) return;
            //status: 0 - 未完成，1 - 已完成，2 - 已领取
            // 一次只做1/2
            let taskList = result.result.taskList;
            let max = Math.ceil(taskList.length/2);
            taskList = taskList.filter(item=>{
                return item.status !=1;
            });
            taskList = taskList.slice(0,max);
            // 一次只做1/3

            for(let task of result.result.taskList) {
                let doneStr = '';
                if(task.taskTotalCount) {
                    doneStr = ` ${task.taskDoneCount}/${task.taskTotalCount}`;
                }
                let statusStr = (task.status==0) ? '未完成' : ((task.status==1) ? '已完成' : '已领取');
                console.log(`账号[${this.index}]任务[${sceneId}-${task.itemId}](${task.itemName}):${doneStr} +${task.rewardDisplayValue} ${statusStr}`);

                if(task.status == 0) {
                    this.task.push({sceneId:sceneId,taskId:task.itemId});
                } else if(task.status == 1) {
                    this.reward.push({sceneId:sceneId,taskId:task.itemId});
                }
            }
        } else {
            console.log(`账号[${this.index}]查询任务列表失败: ${result.message}`);
        }
    }
    // 做任务
    async doTask(sceneId, taskId, taskData) {
        var time = `${(new Date()).getTime()}`;
        var signo = `${time}${taskId}`;
        let url = `https://taskframe.58.com/web/task/dotask?timestamp=${time}&sign=${MD5Encrypt(signo)}&taskId=${taskId}`;
        if (taskData) {
            url = `https://taskframe.58.com/web/task/dotask?timestamp=${time}&sign=${MD5Encrypt(signo)}&taskId=${taskId}&taskData=${taskData}`;
        }
        let body = ``;
        let urlObject = populateUrlObject(url,this.cookie,body);
        await httpRequest('get',urlObject);
        let result = httpResult;
        if(!result) return;
        // console.log(JSON.stringify(result))
        if(result.code == 0) {
            console.log(`账号[${this.index}]完成任务[${sceneId}-${taskId}]`);
            return true;
        } else {
            if (result.message == "任务已完成") {
                console.log(`账号[${this.index}]完成任务[${sceneId}-${taskId}]成功`);
                return true;
            } else {
                console.log(`账号[${this.index}]完成任务[${sceneId}-${taskId}]失败: ${result.message}`);
                return false;
            }
        }
    }
    // 领取任务奖励
    async getReward(sceneId,taskId) {
        var time = `${(new Date()).getTime()}`;
        var signo = `${time}${taskId}`;
        let url = `https://taskframe.58.com/web/task/reward?timestamp=${time}&sign=${MD5Encrypt(signo)}&taskId=${taskId}`;
        let body = ``;
        let urlObject = populateUrlObject(url,this.cookie,body);
        await httpRequest('get',urlObject);
        let result = httpResult;
        if(!result) return;
        // console.log(JSON.stringify(result))
        if(result.code == 0) {
            console.log(`账号[${this.index}]领取任务[${sceneId}-${taskId}]奖励成功`);
            return true;
        } else {
            // 偷矿任务 code = 2 也是成功 具体看message
            // console.log(JSON.stringify(result))
            if (result.code == 2 && result.message == "任务已完成") {
                console.log(`账号[${this.index}]领取任务[${sceneId}-${taskId}]奖励成功`);
                return true;
            } else {
                console.log(`账号[${this.index}]领取任务[${sceneId}-${taskId}]奖励失败: ${result.message}`);
                return false;
            }
        }
    }



    // 查询钱包
    async getWalletInfo() {
        let url = `https://wallet.58.com/web/user/main`;
        let body = ``;
        let urlObject = populateUrlObject(url,this.cookie,body);
        await httpRequest('get',urlObject);
        let result = httpResult;
        if(!result) return;
        // console.log(result)
        if(result.code == 0) {
            addNotifyStr(`账号[${this.index}-${this.nickName}]钱包余额: ${result.result.dataList[0].balance}, ${result.result.dataList[0].subTitle}元`);
        } else {
            console.log(`账号[${this.index}-${this.nickName}]查询钱包失败: ${result.message}`);
        }
    }
    // 查询神奇矿主页
    async oreMainpage(dotask=true) {
        let url = `https://magicisland.58.com/web/mineral/main?openSettings=0`;
        let body = ``;
        let urlObject = populateUrlObject(url,this.cookie,body);
        await httpRequest('get',urlObject);
        let result = httpResult;
        if(!result) return;
        // console.log(JSON.stringify(result))
        if(result.code == 0) {
            this.ore.sign = result.result.tasks?.sign?.state;
            this.ore.rent = result.result.tasks?.rent?.state;
            this.ore.dailyore = result.result.userInfo.dailyOre;
            this.ore.ore = parseFloat(result.result.userInfo.minerOre);
            this.ore.money = parseFloat(result.result.userInfo.minerOreValue);
            this.nickName = result.result.userInfo?.nickName || '';
            if(dotask) {
                let gameStatus = result.result.games.gameProcess;
                let gameStr = '';
                if(gameStatus.awardState==0) {
                    if(gameStatus.gameNum==gameStatus.joinedNum) {
                        this.ore.gameFlag = 1;
                        gameStr = '已完成';
                    } else {
                        this.ore.gameFlag = 0;
                        gameStr = '未完成';
                    }
                } else {
                    this.ore.gameFlag = 2;
                    gameStr = '已领取';
                }
                let signStr = (this.ore.sign==0) ? '未签到' : '已签到';
                let rentStr = (this.ore.rent==0) ? '未浏览好房' : '已浏览好房';
                let dailyStr = (this.ore.dailyore==0) ? '未采集' : '已采集';
                addNotifyStr(`账号[${this.index}-${this.nickName}]今日神奇矿${dailyStr}，${signStr}，${rentStr}，参加三个小游戏任务${gameStr}`);
                if(this.ore.sign==0) {
                    await $.wait(500);
                    // 神奇矿签到
                    await this.oreSign();
                }
                // 活动已结束，请求参数错误
                // // todo 应该是传参导致没返回rent 信息 , 只有0点执行一次
                // if(!this.ore.rent && curHour == 0) {
                //     await $.wait(500)
                //     // 浏览好房
                //     // await this.visitHouse()
                // }
                if(this.ore.dailyore==0) {
                    await $.wait(500);
                    // 采集神奇矿
                    await this.getDailyore();
                }
                if(this.ore.gameFlag==1) {
                    await $.wait(500);
                    // 领取游戏完成奖励
                    await this.oreGameScore();
                }
                addNotifyStr(`账号[${this.index}-${this.nickName}]神奇矿余额${this.ore.ore} ≈ ${this.ore.money}元`);
            }
        } else {
            console.log(`账号[${this.index}]查询神奇矿主页失败: ${result.message}`);
        }
    }
    // 采集神奇矿
    async getDailyore() {
        let url = `https://magicisland.58.com/web/mineral/dailyore`;
        let body = ``;
        let urlObject = populateUrlObject(url,this.cookie,body);
        await httpRequest('get',urlObject);
        let result = httpResult;
        if(!result) return;
        //console.log(result)
        if(result.code == 0) {
            console.log(`账号[${this.index}]采集神奇矿成功`);
        } else {
            addNotifyStr(`账号[${this.index}-${this.nickName}]采集神奇矿失败: ${result.message}`);
        }
    }
    // 神奇矿签到
    async oreSign() {
        let url = `https://magicisland.58.com/web/sign/signInV2?sessionId=&successToken=&scene=null`;
        let body = ``;
        let urlObject = populateUrlObject(url,this.cookie,body);
        await httpRequest('get',urlObject);
        let result = httpResult;
        if(!result) return;
        //console.log(result)
        if(result.code == 0) {
            this.ore.ore += parseFloat(result.result.ore);
            this.ore.money += parseFloat(result.result.amount);
            console.log(`账号[${this.index}]神奇矿签到成功，获得${result.result.ore}矿石 ≈ ${result.result.amount}元`);
        } else {
            addNotifyStr(`账号[${this.index}-${this.nickName}]神奇矿签到失败: ${result.message}`);
        }
    }

    // 查询低价竞拍主页
    async auctionInfo() {
        let url = `https://magicisland.58.com/web/auction/second`;
        let body = ``;
        let urlObject = populateUrlObject(url,this.cookie,body);
        urlObject.headers.Referer = 'https://magicisland.58.com/web/v/lowauctiondetail';
        await httpRequest('get',urlObject);
        let result = httpResult;
        if(!result) return;
        //console.log(result)
        // 直接梭哈
        if(result.code == 0) {
            this.auction.status = result.result.bidInfo.bidStatus;
            let auctionStr = (this.auction.status==0) ? '未参与竞拍' : '已参与竞拍';
            console.log(`账号[${this.index}]今天${auctionStr}`);
            let maxBid = parseFloat(result.result.userInfo.usableOre);
            let dixBid = 5 + this.index;
            console.log(`账号[${this.index}]可投入矿石${maxBid}mg，据规则实际投入${330 ? 330 - dixBid : parseInt(maxBid) - dixBid}mg`);
            // todo 最后参与10分钟竞拍，可以计算出一个相对较大概率的数字
            if(this.runTask == 1) {
                if(this.auction.status==0 && maxBid > dixBid) {
                    let tnmp = maxBid - dixBid > 330 ? 330 - dixBid : parseInt(maxBid) - dixBid; // 留6mg矿石挖矿
                    await $.wait(500);
                    await this.auctionBid(tnmp);
                }
            }
        } else {
            console.log(`账号[${this.index}]查询低价竞拍主页失败: ${result.message}`);
        }
        // if(result.code == 0) {
        //     this.auction.status = result.result.bidInfo.bidStatus
        //     let auctionStr = (this.auction.status==0) ? '未参与竞拍' : '已参与竞拍'
        //     console.log(`账号[${this.index}]今天${auctionStr}`)
        //     let maxBid = parseFloat(result.result.userInfo.usableOre)
        //     let bidNum = 1
        //     if(this.runTask == 1) {
        //         if(this.auction.status==0) {
        //             if(maxBid >= bidNum) {
        //                 await $.wait(500)
        //                 await this.auctionBid(bidNum)
        //             } else {
        //                 console.log(`账号[${this.index}]可用矿石余额${maxBid}不足，不能竞拍出价${bidNum}矿石`)
        //             }
        //         } else if(this.auction.status==1) {
        //             let lastBid = parseInt(result.result.bidInfo.bidOre)
        //             bidNum = (lastBid)%3 + 1
        //             if(maxBid >= bidNum) {
        //                 await $.wait(500)
        //                 await this.auctionModify(bidNum,result.result.bidInfo.auctionNumber)
        //             } else {
        //                 console.log(`账号[${this.index}]可用矿石余额${maxBid}不足，不能竞拍出价${bidNum}矿石`)
        //             }
        //         }
        //     }
        // } else {
        //     console.log(`账号[${this.index}]查询低价竞拍主页失败: ${result.message}`)
        // }
    }

    async auctionBid(prize) {
        let url = `https://magicisland.58.com/web/auction/bid`;
        let body = `ore=${prize}`;
        let urlObject = populateUrlObject(url,this.cookie,body);
        urlObject.headers.Referer = 'https://magicisland.58.com/web/v/lowauctiondetail';
        await httpRequest('post',urlObject);
        let result = httpResult;
        if(!result) return;
        //console.log(result)
        if(result.code == 0) {
            console.log(`账号[${this.index}]竞拍出价${prize}矿石成功`);
        } else {
            console.log(`账号[${this.index}]竞拍出价${prize}矿石失败: ${result.message}`);
        }
    }

    async auctionModify(prize,number) {
        let url = `https://magicisland.58.com/web/auction/modify`;
        let body = `ore=${prize}&number=${number}`;
        let urlObject = populateUrlObject(url,this.cookie,body);
        urlObject.headers.Referer = 'https://magicisland.58.com/web/v/lowauctiondetail';
        await httpRequest('post',urlObject);
        let result = httpResult;
        if(!result) return;
        //console.log(result)
        if(result.code == 0) {
            console.log(`账号[${this.index}]竞拍改价${prize}矿石成功`);
        } else {
            console.log(`账号[${this.index}]竞拍改价${prize}矿石失败: ${result.message}`);
        }
    }
    // 领取游戏完成奖励
    async oreGameScore() {
        let url = `https://magicisland.58.com/web/mineral/gameprocessore`;
        let body = ``;
        let urlObject = populateUrlObject(url,this.cookie,body);
        await httpRequest('get',urlObject);
        let result = httpResult;
        if(!result) return;
        //console.log(result)
        if(result.code == 0) {
            console.log(`账号[${this.index}]领取游戏完成奖励成功`);
        } else {
            console.log(`账号[${this.index}]领取游戏完成奖励失败: ${result.message}`);
        }
    }
    // 查询打卡状态
    async attendanceDetail() {
        let url = `https://magicisland.58.com/web/attendance/detail/info?productorid=3`;
        let body = ``;
        let urlObject = populateUrlObject(url,this.cookie,body);
        await httpRequest('get',urlObject);
        let result = httpResult;
        if(!result) return;
        // console.log(result)
        if(result.code == 0) {
            let attendList = '';
            console.log(`账号[${this.index}]今天打卡状态:`);
            for(let item of result.result.infoList) {
                let type = attendType[item.type];
                let str = (item.userState==0) ? '未报名' : ((item.userState==5) ? '可打卡' :'已报名');
                console.log(`账号[${this.index}]${type}${item.number}期 -- ${str}`);
                if(item.userState==0) {
                    if(this.runTask == 1) {
                        if(this.ore.ore >= item.oreLimitValue) {
                            await $.wait(500);
                            await this.attendanceSignIn(item);
                        } else {
                            console.log(`账号[${this.index}]矿石余额${this.ore.ore}不足，不能花费${item.oreLimitValue}矿石报名${type}${item.number}期打卡`);
                        }
                    }
                } else if (item.userState==5) {
                    let numType = (item.type=='multiDay') ? 'numberMany' : 'number';
                    attendList += `&${numType}=${item.number}`;
                }
            }
            if(attendList) {
                await $.wait(500);
                await this.attendanceAttend(attendList);
            }
        } else {
            console.log(`账号[${this.index}]查询打卡状态失败: ${result.message}`);
        }
    }

    async attendanceSignIn(item) {
        let type = attendType[item.type];
        let url = `https://magicisland.58.com/web/attendance/signIn`;
        let body = `number=${item.number}&category=${item.type}&productorid=3`;
        let urlObject = populateUrlObject(url,this.cookie,body);
        urlObject.headers.Referer = 'https://magicisland.58.com/web/v/client';
        await httpRequest('post',urlObject);
        let result = httpResult;
        if(!result) return;
        //console.log(result)
        if(result.code == 0) {
            console.log(`账号[${this.index}]报名${type}${item.number}期成功，预计可获得${result.result.averageRewardOre}矿石`);
        } else {
            addNotifyStr(`账号[${this.index}-${this.nickName}]报名${type}${item.number}期失败: ${result.message}，需手动处理，否则每天少1mg矿石收益，活动路径：58同城app->我的->神奇矿->游戏赚矿石下面的早起打卡，进去报名`);
        }
    }

    async attendanceAttend(attendList) {
        let url = `https://magicisland.58.com/web/attendance/attend`;
        let body = `productorid=3${attendList}`;
        let urlObject = populateUrlObject(url,this.cookie,body);
        urlObject.headers.Referer = 'https://magicisland.58.com/web/v/client';
        await httpRequest('post',urlObject);
        let result = httpResult;
        if(!result) return;
        //console.log(result)
        if(result.code == 0) {
            console.log(`账号[${this.index}]打卡成功`);
        } else {
            addNotifyStr(`账号[${this.index}-${this.nickName}]打卡失败: ${result.message}，请手动打打卡，8点后将损失0.4元。打卡路径：我的->神奇矿->早起打卡'`);
        }
    }


    // 查询我的家运行情况
    async houseWorkList() {
        let url = `https://lovely-house.58.com/housework/get`;
        let body = ``;
        let urlObject = populateUrlObject(url,this.cookie,body);
        await httpRequest('get',urlObject);
        let result = httpResult;
        if(!result) return;
        // console.log(JSON.stringify(result))
        if(result.code == 0) {
            if (result.result.houseworkTaskVOList.length) {
                console.log(`账号[${this.index}]家里有情况`);
                for (let i =0 ; i < result.result.houseworkTaskVOList.length; i++) {
                    await $.wait(500);
                    await this.doHouseWorkTask(result.result.houseworkTaskVOList[i]);
                }

            } else {
                console.log(`账号[${this.index}]家里一切安好`);
            }
        } else {
            console.log(`账号[${this.index}]查询我的家运行情况失败: ${result.message}`);
        }
    }

    // 我的家维修或打扫
    async doHouseWorkTask(item) {
        let furnitureId = item.furnitureId;
        let url = `https://lovely-house.58.com/housework/clean`;
        let body = `furnitureId=${furnitureId}`;
        let urlObject = populateUrlObject(url,this.cookie,body);
        await httpRequest('post',urlObject);
        let result = httpResult;
        if(!result) return;
        console.log(result);
        if(result.code == 0) {
            console.log(`账号[${this.index}]${item.okMsg}`);
            if (result.result?.nextTaskList?.houseworkTaskVOList.length) {
                await $.wait(500);
                await this.doHouseWorkTask(result.result.nextTaskList.houseworkTaskVOList[0]);
            } else {
                console.log(`账号[${this.index}]已全部清理干净`);
            }
        } else {
            console.log(`账号[${this.index}]维修家电或打扫失败: ${result.message}`);
        }
    }

    // 我的家收取金币
    async collectCoin() {
        let url = `https://lovely-house.58.com/fortunecat/collect`;
        let body = `_d=Z2UwMHx2a25aNzZabzpaZiA3OTgyWnMjImFabnQgMVoiW1ZuW3lPcXdQZXNoLGpaNzF7ZmJadVYwOHRUNDJmNFpfa2NqazNNO29wOE5CVlREYTlHYjhTPmJxInNaZGFjYiJ2IEUtQ0QiZDpnMnlsIiAiOTZuZSBuaTdiOWFaIm1pLG8gIGxaWiIeenVCRHVTQU9GUGtMWm4iNTQiYWtuWkk2MzlVYWZmNztWPE0xMUR5VEVnMFw4O1RqOTNrRVM+V083LG8iNjk6ZSx2WkE3RUBaZDo4YgpmHiAeNjQgeFogWjkwYjcicFpwWmd0IG0jInc6b2x7cHFSbmN1ZDZabmgeMTcqZSIgIkU1J2U7YDU4X0xGNDF2Tk1yRjdYek1SRWNxaWQyM24vcndvWmoeMzRmOlppJTdELjNvOmEzNyB5Olo6MDggYyIgImIzMmMsbSJrbloyWm4yLHIgRjdPN2d1Njd3ZVllIHM6NzkKYx4gHj03U3gyZDg0Jnlueld3VjI8Q1xpTGpGTlt3WDZrTl0pey47bnI6NTE0Y25kOCtGQS97ZDA2Oh5RHiMgNjVadDRaHjc3YmBaYR5tICJaIFovWmxaamJ7UW9sY2JvZTptIHUgNlogcjpaOjYzTzI5Zzs5TkZRWG0xTUl2TEhrLWJMcU4wSVFLa2FEajMzIHYgMDk2ZyBaQzBCOUQgOjNjNiNfJXZaNVoiWlojOjc1MTZucjpvIB4idyIsbmMgQjZPUlQ2RDY1eEdEWmJaOyIeUR4iIDc2QHczPGFiRUgxd1NMcXJ6ZjVkc01TQVY7Tmg7NCRWTWU1IGZaNmJhNiAiRzctQTcLYTZiPGJze2kiNyJuIiJqIDRiMzcgaSBlWjosYx4wIG5yVnB7bV9YU3FvNG5aIm0jOFoiXyVwWjk2cWVlZjdgT0YwcFRHVkppNVtWQ2RmbGFTNFh0TFdJfXdBWmkiMjc3Y1oeQjE7NTF9NGEzOGhiWmQ2Myx1HixuWmc6ODEgbVpaIyBadTovIFp0U3VBMlVicjc/ZTIidXAvNG9pc3txIzY0dCZkZDYwRXBkO0xJWHZucTNIWVN1ZzJbTS8yUUNFaGVaI2QuaTA1WiM6QzVGN1o=|X1FnRzV4bHF1TjtSjzA_OYSIb1xubV9VXlA6XkdOe3hMYz-FRFiBN15oPVhRam5Pj1Bwi3RihnZoe05pX0ZSVU94iE56cEY6TGtpTHVmSU99P3xzUzRcXnxxTHhZcjdxX4BPTURVTmVwND01YjZeW0tofn-Fek80cGk_aHlhajtQUkN8Zm1wN2llQTVMOlBtTlJDS0RIRjc-fj9hazh_OU9Mi2NDeU9uOlhnWVN1j38=|kmzFEO9PEnKAESxbTcyokAFZweGn3LhgXOXzNRzIaC2QKmMjStAuEVq5AUhyL6fu`;
        let urlObject = populateUrlObject(url,this.cookie,body);
        await httpRequest('post',urlObject);
        let result = httpResult;
        if(!result) return;
        // console.log(result)
        if(result.code == 0) {
            console.log(`账号[${this.index}]收取${result.result}金币}\n`);
        } else {
            console.log(`账号[${this.index}]维修家电或打扫失败: ${result.message}`);
        }
    }

    // 获取可偷矿列表
    async getStrangerInfo() {
        let url = `https://magicisland.58.com/web/mining/strangerInfo`;
        let body = ``;
        let urlObject = populateUrlObject(url,this.cookie,body);
        await httpRequest('get',urlObject);
        let result = httpResult;
        if(!result) return;
        // console.log(result)
        if(result.code == 0) {
            const strangerCurrent = result.result.strangerCurrent || 0;
            const strangerMax = result.result.strangerMax || 0;
            if (strangerCurrent < strangerMax) {
                let canstrangerList = result.result.strangerList.filter((item)=>{
                    return item.status === 0;
                });
                // 降序排列
                canstrangerList = canstrangerList.sort(compare('ore'));
                console.log(`账号[${this.index}]可偷取好友${canstrangerList.length || 0}个`);
                console.log(`账号[${this.index}]开始第${strangerCurrent+1}次偷矿`);

                if (canstrangerList.length) {
                    await $.wait(500);
                    await this.stealStranger(canstrangerList[0].id);
                }
            } else {
                console.log(`账号[${this.index}]偷矿次数已用完`);
            }
        } else {
            console.log(`账号[${this.index}]获取可偷矿列表失败: ${result.message}`);
        }
    }

    // 去偷矿
    async stealStranger(id) {
        let url = `https://magicisland.58.com/web/mining/stealStranger?id=${id}`;
        let body = ``;
        let urlObject = populateUrlObject(url,this.cookie,body);
        await httpRequest('get',urlObject);
        let result = httpResult;
        if(!result) return;
        // console.log(result)
        if(result.code == 0) {
            // 直接偷矿
            if (result.result.state === 0) {
                await $.wait(500);
                console.log(`账号[${this.index}]偷到${result.result.ore}mg矿石`);
                // await this.getStrangerInfo();
            } else if (result.result.state === 2) {// 做任务偷矿
                await $.wait(200);
                await this.getTaskFrame();
            }
        } else {
            console.log(`账号[${this.index}]去偷矿失败: ${result.message}`);
        }
    }

    // 获取偷矿前置任务类型
    async getTaskFrame() {
        const sceneId = 34;
        let url = `https://taskframe.58.com/web/task/dolist?sceneId=${sceneId}&openpush=0&source=`;
        let body = ``;
        let urlObject = populateUrlObject(url,this.cookie,body);
        await httpRequest('get',urlObject);
        let result = httpResult;
        if(!result) return;
        // console.log(result)
        if(result.code == 0) {
            const taskList = result.result.taskList;
            console.log(`账号[${this.index}]需要${taskList[0].taskDescription}`);
            const taskDescription = taskList[0].taskDescription;

            if (taskDescription.includes('观看') || taskDescription.includes('视频') || taskDescription.includes('浏览')) {
                await $.wait(500);
                // 做任务
                await this.doTask(sceneId, taskList[0].itemId);
                await $.wait(200);
                // 领取任务奖励
                const res = await this.getReward(sceneId, taskList[0].itemId);
                if (res) {
                    await $.wait(200);
                    // 做完任务，继续偷矿
                    await this.getStrangerInfo();
                }
            } else if (taskDescription.includes('关注3个服务号')) {
                const start = new Date().getTime();
                await $.wait(200);
                await this.loadAggregation();
                await $.wait(200);
                await this.getRecommendAtion();
                await $.wait(200);

                if (this.recommendAtion.length >= 3) {
                    // 取消前3个
                    for(let j = 0; j < 3; j++) {
                        await this.follow(this.recommendAtion[j].serviceId, 0);
                        await $.wait(500);
                    }
                    // 关注前3个
                    for(let j = 0; j < 3; j++) {
                        await this.follow(this.recommendAtion[j].serviceId, 1);
                        await $.wait(500);
                    }
                }
                const end = new Date().getTime();
                const taskData = ((end-start)/1000).toFixed(3);
                await this.doTask(sceneId, taskList[0].itemId, taskData);
            }
        } else {
            console.log(`账号[${this.index}]去偷矿失败: ${result.message}`);
        }
    }
    // 加载关注服务任务页面
    async loadAggregation() {
        let url = `https://messcenter.58.com/app/service/aggregation?source=2`;
        let body = ``;
        let urlObject = populateUrlObject(url,this.cookie,body);
        await httpRequest('get',urlObject);
    }
    // 获取可关注列表
    async getRecommendAtion() {
        let url = `https://messcenter.58.com/app/service/aggregation/recommendation?pageNum=1&queryFollowType=1`;
        let body = ``;
        let urlObject = populateUrlObject(url,this.cookie,body);
        await httpRequest('get',urlObject);
        let result = httpResult;
        if(!result) return;
        // console.log(result)
        if(result.code == 580200) {
            this.recommendAtion = result.data || [];
        } else {
            console.log(`账号[${this.index}]获取可关注列表失败: ${result.message}`);
        }
    }

    // 关注
    async follow(serviceId, type) {
        let url = `https://messcenter.58.com/app/service/follow`;
        let body = `serviceId=${serviceId}&type=${type}`;
        let urlObject = populateUrlObject(url,this.cookie,body);
        await httpRequest('post',urlObject);
        let result = httpResult;
        if(!result) return;
        // console.log(JSON.stringify(result))
        if(result.code == 580200) {
            console.log(`账号[${this.index}]${type === 0 ? '取消': ''}关注${serviceId}成功`);
            return true;
        } else {
            console.log(`账号[${this.index}]${type === 0 ? '取消': '关注'}失败: ${result.message}`);
            return false;
        }
    }

    // 雇佣临时矿工任务
    async doEmploy () {
        const coin = Number(this.mineMaininfo.userInfo.coin);
        const employMinerConsumeCoinNum = Number(this.mineMaininfo.updateInfo.employMinerConsumeCoinNum);
        if (coin < employMinerConsumeCoinNum) {
            console.log(`账号[${this.index}]金币不够，不雇佣临时矿工`);
            return;
        }
        if (employMinerConsumeCoinNum > 400) {
            console.log(`账号[${this.index}]已经雇佣2个临时矿工，不继续雇佣`);
            return;
        }

        await this.employ();
        await $.wait(200);
        await this.getMineMaininfo();
        await $.wait(200);
        await this.doEmploy();
    }
    // 雇佣临时矿工
    async employ () {
        let url = `https://dreamtown.58.com/web/mine/employ`;
        let body = ``;
        let urlObject = populateUrlObject(url,this.cookie,body);
        await httpRequest('get',urlObject);
        let result = httpResult;
        if(!result) return;
        // console.log(JSON.stringify(result))
        if(result.code == 0) {
            console.log(`账号[${this.index}]雇佣到一个矿工`);
        } else {
            console.log(`账号[${this.index}]雇佣矿工失败: ${result.message}`);
        }
    }

    // 唤醒金币矿工任务
    async doWakeupEmploy () {
        const type = this.mineMaininfo.machineInfo.type;
        if (type == 1 || type == 2) {
            const res = await this.videoStart(2);
            if (res) {
                await $.wait(500);
                await this.videoFinish(2);
                await $.wait(200);
                await this.getMineMaininfo();
                addNotifyStr(`账号[${this.index}-${this.nickName}]唤醒金币矿工成功, 挖矿10分钟`);
            }
        }
    }
    // 查询抽奖次数
    async rouletteInfo() {
        let url = `https://magicisland.58.com/web/roulette/info`;
        let body = ``;
        let urlObject = populateUrlObject(url,this.cookie,body);
        await httpRequest('get',urlObject);
        let result = httpResult;
        if(!result) return;
        // console.log(JSON.stringify(result))
        if(result.code == 0) {
            console.log(`账号[${this.index}]有${result.result.times}次免费抽奖机会`);
            this.awardList = result.result.info;
            await $.wait(500);
            await this.getAwardUserList();
        } else {
            console.log(`账号[${this.index}]查询抽奖次数失败: ${result.message}`);
        }
    }

    // 获取已有奖品列表
    async getAwardUserList() {
        let url = `https://magicisland.58.com/web/roulette/getAwardUserList?pageNum=1&pageSize=5&state=1`;
        let body = ``;
        let urlObject = populateUrlObject(url,this.cookie,body);
        await httpRequest('get',urlObject);
        let result = httpResult;
        if(!result) return;
        //console.log(JSON.stringify(result))
        if(result.code == 0) {
            if (result.result.reward.length) {
                for(let i = 0; i<result.result.reward.length; i++) {
                    const reward = result.result.reward[i];
                    if (reward.type === 1) {
                        // 待确认，0已确认
                        const doneStrMap = {
                            0: '未完成',
                            1: '已完成',
                            2: '未领取',
                            3: '已领取',
                        };
                        console.log(`账号[${this.index}]红包${i+1}:${reward.actualNumber}元，${reward.currentNumber}/${reward.total} ${doneStrMap[reward.awardState]}`);
                    }
                }
            }

            const hongbao = result.result.reward.filter((item)=>{
                return item.type === 1;
            });

            if (hongbao.length == 3) {
                console.log(`账号[${this.index}]有未提现的红包，暂时不能继续抽奖`);
                return;
            }
            if (result.result.totalNum <= 3 && result.result.totalNum > 0) {
                await $.wait(500);
                await this.luckyDraw();
                console.log(`账号[${this.index}]有${result.result.totalNum}次免费抽奖机会`);
            }
        } else {
            console.log(`账号[${this.index}]获取已有奖品列表失败: ${result.message}`);
        }
    }

    // 抽奖
    async luckyDraw() {
        let url = `https://magicisland.58.com/web/roulette/luckyDraw?setNum=2`;
        let body = ``;
        let urlObject = populateUrlObject(url,this.cookie,body);
        await httpRequest('get',urlObject);
        let result = httpResult;
        if(!result) return;
        console.log('抽奖:', JSON.stringify(result));
        if(result.code == 0) {
            const info = this.awardList.find((iten)=>{
                return iten.type === result.result.type;
            });
            if (info) {
                console.log(`账号[${this.index}]抽到: ${info.text}`);
                // type 1-邀请红包 2-矿石（需领取）3-转盘+1次 未知 4-谢谢参与
                if (info.type === 2) {
                    await $.wait(500);
                    this.receiveOre(result.result.awardId);
                }
            }
        } else {
            console.log(`账号[${this.index}]抽奖失败: ${result.message}`);
        }
    }

    // 领取抽奖奖品
    async receiveOre(awardId) {
        let url = `https://magicisland.58.com/web/roulette/receiveOre?id=${awardId}`;
        let body = ``;
        let urlObject = populateUrlObject(url,this.cookie,body);
        await httpRequest('get',urlObject);
        let result = httpResult;
        if(!result) return;
        //console.log(JSON.stringify(result))
        if(result.code == 0) {
            console.log(`账号[${this.index}]已领取`);
        } else {
            console.log(`账号[${this.index}]领取抽奖奖品失败: ${result.message}`);
        }
    }

    // 梦想小镇-房子/车子场景切换
    async dreamTownSwitch(target) {
        let url = `https://dreamtown.58.com/web/dreamtown/switch`;
        let body = `target=${target}`;
        let urlObject = populateUrlObject(url,this.cookie,body);
        await httpRequest('post',urlObject);
        let result = httpResult;
        if(!result) return;
        // console.log(JSON.stringify(result))
        const names = {
            1: '我的房子',
            2: '我的车子',
        };
        if(result.code == 0) {
            console.log(`账号[${this.index}]场景切换到梦想小镇${names[target]}`);
        } else {
            console.log(`账号[${this.index}]场景切换到梦想小镇${names[target]}失败: ${result.message}`);
        }
    }

    // 查询梦想小镇大富翁详情
    async dreamTownmainInfo(target) {
        let url = `https://dreamtown.58.com/web/dreamtown/maininfo?initialization=1`;
        let body = ``;
        let urlObject = populateUrlObject(url,this.cookie,body);
        await httpRequest('get',urlObject);
        let result = httpResult;
        if(!result) return;
        // console.log(JSON.stringify(result))
        if(result.code == 0) {
            this.maininfo = result.result;

            // 房子信息
            if (target === 1 && !this.showHouse) {
                this.showHouse = true;
                console.log(`账号[${this.index}]房子${this.maininfo.levelInfo.house}级，30级可领30元。`);
            }

            // 车信息
            if (target === 2 && !this.showCar) {
                this.showCar = true;
                console.log(`账号[${this.index}]车子${this.maininfo.levelInfo.car}级`);
                console.log(`账号[${this.index}]车子领取规则：`);
                console.log(`车子合成到12级：领取0.2元`);
                console.log(`车子合成到20级：领取5元`);
                console.log(`车子合成到30级：领取8元`);
                console.log(`车子合成到40级：领取15元`);
                console.log(`车子合成到50级：领取60元`);
            }

            // 检查宝箱
            for (const key in this.maininfo.locationInfo) {
                if (this.maininfo.locationInfo[key] && this.maininfo.locationInfo[key].state === 1) {
                    await $.wait(200);
                    await this.openJewellery(this.maininfo.locationInfo[key].locationIndex);
                }
            }
        } else {
            console.log(`账号[${this.index}]查询梦想小镇大富翁详情失败: ${result.message}`);
        }
    }

    // 开宝箱
    async openJewellery (locationIndex) {
        let url = `https://dreamtown.58.com/web/dreamtown/open`;
        let body = `locationIndex=${locationIndex}`;
        let urlObject = populateUrlObject(url,this.cookie,body);
        await httpRequest('post',urlObject);
        let result = httpResult;
        if(!result) return;
        // console.log(JSON.stringify(result))
        if(result.code == 0) {
            console.log(`账号[${this.index}]开宝箱获得：${result.result.name}`);
        } else {
            console.log(`账号[${this.index}]开宝箱失败: ${result.message}`);
        }
    }

    // 梦想小镇-加速建筑 todo
    async speedUp() {
        if (!this.maininfo.speedInfo.speedTimes) {
            console.log(`账号[${this.index}]可加速次数为0`);
            return;
        }
        if (!this.maininfo.speedInfo.expireTime != 0) {
            console.log(`账号[${this.index}]加速效果还未失效`);
            return;
        }

        let url = ``;
        let body = `fromId=${info.fromId}&toId=${info.toId}`;
        let urlObject = populateUrlObject(url,this.cookie,body);
        await httpRequest('post',urlObject);
        let result = httpResult;
        if(!result) return;
        // console.log(JSON.stringify(result))
        if(result.code == 0) {
            console.log(`账号[${this.index}]建筑加速成功`);
        } else {
            console.log(`账号[${this.index}]建筑加速失败: ${result.message}`);
        }
    }

    getEmpty() {
        let empty = 0;
        for (const key in this.maininfo.locationInfo) {
            if (this.maininfo.locationInfo[key] === null) {
                empty+=1;
            }
        }
        return empty;
    }

    // 梦想小镇-合成建筑
    async compound() {
        // 将购买记录清空
        this.buyNum = 0;
        // 查询可以合成的地块
        const info = this.compoundInfo();
        // 不可合成
        if (!info.flag) {
            // 查询空地
            const empty = this.getEmpty();
            // 有空地
            if (empty) {
                console.log(`账号[${this.index}]没有可合成地块,但有${empty}块空地`);
                await this.buyBuild(empty);
            } else {
                // 无可合成且无空地，卖掉一个
                console.log(`账号[${this.index}]没有可合成地块,也没有空地，卖掉等级最低的！`);
                // 查询等级最低的地块
                const minInfo = this.findMin();
                if (minInfo) {
                    // 售卖
                    await this.sellBuild(minInfo.locationIndex);
                    await $.wait(100);
                    await this.dreamTownmainInfo();
                    await $.wait(200);
                    // 合成
                    await this.compound();
                }
            }
            return;
        }
        let url = `https://dreamtown.58.com/web/dreamtown/compound`;
        let body = `fromId=${info.fromId}&toId=${info.toId}`;
        let urlObject = populateUrlObject(url,this.cookie,body);
        await httpRequest('post',urlObject);
        let result = httpResult;
        if(!result) return;
        // console.log(JSON.stringify(result))
        if(result.code == 0) {
            console.log(`账号[${this.index}]地块${info.fromId}合向地块${info.toId}， 地块${info.toId}升级到${info.level+1}级`);

            // 做任务领奖励
            const sceneId = 6;
            const taskId = result.result.itemId;
            if (taskId) {
                await $.wait(200);
                // 做任务
                await this.doTask(sceneId, taskId);
                await $.wait(200);
                // 领取任务奖励
                await this.getReward(sceneId, taskId);
                console.log(`账号[${this.index}]合成地块${info.toId}后做任务获取奖励`);
            }

            await $.wait(100);
            await this.dreamTownmainInfo();
            await $.wait(500);
            await this.compound();
        } else {
            console.log(`账号[${this.index}]合成失败: ${result.message}`);
        }
    }
    // 获取合成信息
    compoundInfo() {
        const locationInfo = this.maininfo.locationInfo;
        let result = {flag: false};
        const tempInfo = {};
        for (let key in locationInfo) {
            if (locationInfo[key]) {
                if (!tempInfo[locationInfo[key].level]) {
                    tempInfo[locationInfo[key].level] = [];
                }
                tempInfo[locationInfo[key].level].push(locationInfo[key]);
            }
        }
        for (let key in tempInfo) {
            if (tempInfo[key].length >=  2) {
                result = {
                    flag: tempInfo[key][0].locationIndex == tempInfo[key][1].locationIndex ? false : true,
                    fromId: tempInfo[key][0].locationIndex,
                    toId: tempInfo[key][1].locationIndex,
                    level: tempInfo[key][0].level,
                };
                return result;
            }
        }
        return result;
    }
    // 查找等级最低的
    findMin() {
        const locationInfo = this.maininfo.locationInfo;
        let result = null;
        const tempInfo = {};
        for (let key in locationInfo) {
            if (locationInfo[key]) {
                if (!tempInfo[locationInfo[key].level]) {
                    tempInfo[locationInfo[key].level] = [];
                }
                tempInfo[locationInfo[key].level].push(locationInfo[key]);
            }
        }
        for (let key in tempInfo) {
            if (tempInfo[key] && tempInfo[key].length == 1) {
                return tempInfo[key][0];
            }
        }
        return result;
    }

    // 梦想小镇-购买建筑
    async buyBuild(num = 1, level) {
        level = level || this.maininfo.fastBuyInfo.level;
        if (!level) {
            console.log(`账号[${this.index}]购买失败：购买建筑等级未知`);
            return;
        }
        const coins =  Number(this.maininfo.userInfo.coin);
        const price = Number(this.maininfo.fastBuyInfo.price)*1.1;
        console.log('coins:', coins);
        console.log('price:', price);
        if (coins < price) {
            this.waitTime = parseInt((price - coins) / this.maininfo.userInfo.coinSpeed) * 1000;
            if ((this.waitTime)/1000 > 300) {
                return;
            }
            console.log(`账号[${this.index}]钱不够, 等待 ${(this.waitTime)/1000}s`);
            await $.wait(this.waitTime);
            await this.dreamTownmainInfo();
            level = this.maininfo.fastBuyInfo.level;
            await $.wait(200);
            // 查询空地
            const empty = this.getEmpty();
            if (empty) {
                await this.buyBuild(1, level);
            } else {
                await this.compound();
            }
        }

        let url = `https://dreamtown.58.com/web/dreamtown/buy`;
        let body = `type=quick&level=${level}`;
        let urlObject = populateUrlObject(url,this.cookie,body);
        await httpRequest('post',urlObject);
        let result = httpResult;
        if(!result) return;
        // console.log('购买结果：',JSON.stringify(result))
        if(result.code == 0) {
            if (result.result.state === 0) {
                console.log('购买成功1个');
                this.buyNum++;
                await $.wait(100);
                await this.dreamTownmainInfo();
                num-=1;
                if (num) {
                    await $.wait(200);
                    await this.buyBuild(num);
                } else {
                    console.log(`账号[${this.index}]购买完成，准备合成`);
                    await $.wait(500);
                    await this.compound();
                }
            } else {
                console.log(`账号[${this.index}]购买失败: ${result.result.message}`);
                if (this.buyNum) {
                    console.log(`账号[${this.index}]之前购买了${this.buyNum}个，先合成`);
                    await $.wait(500);
                    await this.compound();
                } else {
                    if ((this.waitTime)/1000 > 300) {
                        return;
                    }
                    console.log(`账号[${this.index}]等待 ${(this.waitTime)/1000}s`);
                    await $.wait(this.waitTime);
                    await this.dreamTownmainInfo();
                    await $.wait(200);
                    // 查询空地
                    const empty = this.getEmpty();
                    if (empty) {
                        await this.buyBuild(1, level);
                    } else {
                        await this.compound();
                    }

                }
            }
        } else {
            if ((this.waitTime)/1000 > 300) {
                return;
            }
            console.log(`账号[${this.index}]等待 ${(this.waitTime)/1000}s`);
            await $.wait(this.waitTime);
            await this.dreamTownmainInfo();
            await $.wait(200);
            // 查询空地
            const empty = this.getEmpty();
            if (empty) {
                await this.buyBuild(1, level);
            } else {
                await this.compound();
            }
        }
    }

    // 梦想小镇-售卖
    async sellBuild(locationIndex) {
        let url = `https://dreamtown.58.com/web/dreamtown/sell`;
        let body = `locationIndex=${locationIndex}`;
        let urlObject = populateUrlObject(url,this.cookie,body);
        await httpRequest('post',urlObject);
        let result = httpResult;
        if(!result) return;
        // console.log(JSON.stringify(result))
        if(result.code == 0) {
            console.log(`账号[${this.index}]售卖成功`);
        } else {
            console.log(`账号[${this.index}]售卖失败: ${result.message}`);
        }
    }

    // 梦想小镇大富翁 - 前进
    async rolldice() {
        if (!this.maininfo.monopolyInfo.usableTimes) {
            console.log(`账号[${this.index}]梦想小镇大富翁游戏机会已用完`);
            return;
        }
        console.log(`账号[${this.index}]梦想小镇大富翁游戏有${this.maininfo.monopolyInfo.usableTimes}次机会`);

        let url = `https://dreamtown.58.com/web/dreamtown/monopoly/rolldice`;
        let body = ``;
        let urlObject = populateUrlObject(url,this.cookie,body);
        await httpRequest('post',urlObject);
        let result = httpResult;
        if(!result) return;
        // console.log(JSON.stringify(result))
        if(result.code == 0) {
            const award = result.result.award;
            if (award.type === null) { // 已经到账
                if (award.category === 1) {
                    console.log(`账号[${this.index}]获取到: ${award.data}个金币`);
                }
                if (award.category === 3) {
                    console.log(`账号[${this.index}]获取到: ${award.data}体力`);
                }
            } else if (award.type === 'task') { // 做任务
                const sceneId = 2;
                const taskId = award.data;
                await $.wait(500);
                // 做任务
                await this.doTask(sceneId, taskId);
                await $.wait(200);
                // 领取任务奖励
                await this.getReward(sceneId, taskId);
            } else if (award.type === 'coin') { // 做任务
                console.log('需要做任务coin');
            } else if (award.type === 'speed') { // 1次免广告加速机会
                console.log(`账号[${this.index}]获得1次免广告加速机会`);
            } else if (award.type === 'less' || award.type === 'more') {
                // less:获得少量金币 more:获得大量金币
                console.log(`账号[${this.index}]获得: ${award.data}个金币`);
            }

            this.maininfo.monopolyInfo.usableTimes = result.result.timesInfo.usableTimes;

            if (this.maininfo.monopolyInfo.usableTimes) {
                await $.wait(500);
                await this.rolldice();
            }
        } else {
            console.log(`账号[${this.index}]查询梦想小镇大富翁详情失败: ${result.message}`);
        }
    }
    // 召唤超级矿工/增加矿工挖矿时间
    async addWKTime(scene) {
        let url = `https://dreamtown.58.com/web/callback/scene`;
        let body = `scene=${scene}`;
        let urlObject = populateUrlObject(url,this.cookie,body);
        await httpRequest('post',urlObject);
        let result = httpResult;
        if(!result) return;
        console.log(JSON.stringify(result));
        if(result.code == 0) {
            console.log(`账号[${this.index}]召唤超级矿工/增加时间成功`);
        } else {
            console.log(`账号[${this.index}]召唤超级矿工/增加时间失败: ${result.message}`);
        }
    }
    // 神奇矿页面查询
    async getMineMaininfo() {
        let url = `https://dreamtown.58.com/web/mine/maininfo?collect=false`;
        let body = ``;
        let urlObject = populateUrlObject(url,this.cookie,body);
        await httpRequest('get',urlObject);
        let result = httpResult;
        if(!result) return;
        // console.log(JSON.stringify(result))
        if(result.code == 0) {
            this.mineMaininfo = result.result;
        } else {
            console.log(`账号[${this.index}]神奇矿页面查询失败: ${result.message}`);
        }
    }

    // 吃鸡腿加速任务
    async doDrumstick () {
        // const { drumstickCount, drumstickConsumeNum } = this.mineMaininfo.userInfo;
        // 鸡腿够。直接加速，鸡腿不够，deadlineTime:"20"可召唤超级矿工
        // if (drumstickCount < drumstickConsumeNum) {
        //     console.log(`账号[${this.index}]鸡腿不够，不加速`);
        //     return;
        // }
        await this.drumstick();
        // await $.wait(200);
        // await this.getMineMaininfo();
        // await $.wait(6000);
        // await this.doDrumstick();
    }
    // 吃鸡腿加速
    async drumstick() {
        let url = `https://dreamtown.58.com/web/mine/drumstick`;
        let body = ``;
        let urlObject = populateUrlObject(url,this.cookie,body);
        await httpRequest('get',urlObject);
        let result = httpResult;
        if(!result) return;
        // console.log(JSON.stringify(result))
        if(result.code == 0) {
            console.log(`账号[${this.index}]吃鸡腿加速成功`);
        } else {
            // // 可召唤超级矿工
            // if (result.result.deadlineTime) {
            //     console.log('可召唤超级矿工-deadlineTime=', result.result.deadlineTime)
            //     const sceneId = 1 //this.mineMaininfo.superInfo.sceneId;
            //     const res = await this.videoStart(sceneId);
            //     if (res) {
            //         await $.wait(500)
            //         await this.videoFinish(sceneId);
            //         await $.wait(200)
            //         await this.getMineMaininfo();
            //         console.log(`账号[${this.index}]超级矿工挖矿获得${this.mineMaininfo?.machineInfo?.costOre}mg矿石`);
            //     }
            // } else {
            //     if (this.drumstickNum < 4) {
            //         this.drumstickNum++;
            //         console.log(`账号[${this.index}]吃鸡腿加速失败: ${result.message}, deadlineTime=${result.result.deadlineTime}`)
            //         await $.wait(500);
            //         this.drumstick();
            //     }
            // }
        }
    }
    // 神奇矿山视频任务开始
    async videoStart(sceneId) {
        if (!sceneId) return;
        let url = `https://dreamtown.58.com/web/callback/scene?scene=${sceneId}`;
        let body = ``;
        let urlObject = populateUrlObject(url,this.cookie,body);
        await httpRequest('post',urlObject);
        let result = httpResult;
        if(!result) return;
        // console.log(JSON.stringify(result))
        if(result.code == 0) {
            console.log(`账号[${this.index}]神奇矿山视频任务完成`);
            return true;
        } else {
            console.log(`账号[${this.index}]神奇矿山视频任务失败: ${result.message}`);
            return false;
        }
    }
    // 神奇矿山视频任务结束
    async videoFinish(sceneId) {
        if (!sceneId) return;
        let url = `https://dreamtown.58.com/web/mine/videofinish?scene=${sceneId}`;
        let body = ``;
        let urlObject = populateUrlObject(url,this.cookie,body);
        await httpRequest('post',urlObject);
        let result = httpResult;
        if(!result) return;
        // console.log(JSON.stringify(result))
        if(result.code == 0) {
            console.log(`账号[${this.index}]领取神奇矿山视频任务成功`);
        } else {
            console.log(`账号[${this.index}]领取神奇矿山视频任务失败: ${result.message}`);
        }
    }

    // 查看好房，领购房金
    async visitHouse() {
        let url = `https://magicisland.58.com/web/task/callback/common/rent`;
        let body = ``;
        let urlObject = populateUrlObject(url,this.cookie,body);
        await httpRequest('post',urlObject);
        let result = httpResult;
        if(!result) return;
        // console.log(JSON.stringify(result))
        if(result.code == 0) {
            console.log(`账号[${this.index}]查看好房，领购房金成功+1mg`);
        } else {
            console.log(`账号[${this.index}]查看好房，领购房金失败: ${result.message}`);
        }
    }


    // 首页签到情况
    async homeSignInfo() {
        let url = `https://magicisland.58.com/web/sign/signInfo`;
        let body = ``;
        let urlObject = populateUrlObject(url,this.cookie,body);
        await httpRequest('get',urlObject);
        let result = httpResult;
        if(!result) return;
        // console.log(JSON.stringify(result))
        if(result.code == 0) {
            // console.log(`账号[${this.index}]首页签到情况查询成功`);
            return result.result;
        } else {
            console.log(`账号[${this.index}]首页签到情况查询失败: ${result.message}`);
            return null;
        }
    }

    // 通用获取任务列表
    async getTaskListv2(sceneId) {
        if (!sceneId) {
            console.log('sceneId不能为空');
            return [];
        }
        let url = `https://taskframe.58.com/web/task/dolist?sceneId=${sceneId}&openpush=0&source=`;
        let body = ``;
        let urlObject = populateUrlObject(url,this.cookie,body);
        await httpRequest('get',urlObject);
        let result = httpResult;
        if(!result) return;
        // console.log(result)
        if(result.code == 0) {
            const taskList = result.result.taskList || [];
            return taskList;
        } else {
            console.log(`账号[${this.index}]通用获取任务列表失败: ${result.message}`);
        }
    }

    // 初始化矿山
    async initMine () {
        await this.doUserGuide(1);
        await this.doUserGuide(2);
        await this.doUserGuide(3);
        await this.doUserGuide(3);
        await this.doUserGuide(5);
    }
    // 初始化矿山
    async doUserGuide(step) {
        let url = `https://dreamtown.58.com/web/mine/newUserGuide?step=${step}`;
        let body = ``;
        let urlObject = populateUrlObject(url,this.cookie,body);
        await httpRequest('post',urlObject);
        let result = httpResult;
        if(!result) return;
        console.log(JSON.stringify(result));
        if(result.code == 0) {
            console.log(`账号[${this.index}]初始化矿山成功`);
        } else {
            console.log(`账号[${this.index}]初始化矿山${step}失败: ${result.message}`);
        }
    }

    // 神奇矿石离线矿石收取
    async offlineRevenue() {
        const mineCarOre = Number(this.mineMaininfo?.mineInfo?.mineCarOre);
        if (!mineCarOre) return;
        let url = `https://dreamtown.58.com/web/mine/offlineRevenue`;
        let body = ``;
        let urlObject = populateUrlObject(url,this.cookie,body);
        await httpRequest('get',urlObject);
        let result = httpResult;
        if(!result) return;
        console.log(JSON.stringify(result));
        if(result.code == 0) {
            addNotifyStr(`账号[${this.index}-${this.nickName}]神奇矿石离线矿石收取成功, 获得${mineCarOre}mg矿石`);
        } else {
            addNotifyStr(`账号[${this.index}-${this.nickName}]神奇矿石离线矿石收取失败: ${result.message}`);
        }
    }

    // 神奇矿石升级装备
    async upgrade() {
        const coin = Number(this.mineMaininfo?.userInfo?.coin);
        const employMinerUpgradeCostNumber = Number(this.mineMaininfo?.updateInfo?.employMinerUpgradeCostNumber);
        const equipmentLevel = Number(this.mineMaininfo?.updateInfo?.equipmentLevel);
        if (coin < employMinerUpgradeCostNumber || equipmentLevel >= 10) return;
        let url = `https://dreamtown.58.com/web/mine/upgrade`;
        let body = ``;
        let urlObject = populateUrlObject(url,this.cookie,body);
        await httpRequest('get',urlObject);
        let result = httpResult;
        if(!result) return;
        // console.log(JSON.stringify(result))
        if(result.code == 0) {
            addNotifyStr(`账号[${this.index}-${this.nickName}]神奇矿石升级装备成功, 升级为${equipmentLevel + 1}级装备`);
        } else {
            addNotifyStr(`账号[${this.index}-${this.nickName}]神奇矿石升级装备失败: ${result.message}`);
        }
    }
    // 获取累计收益
    async getInvitationUrl() {
        let url = `https://magicisland.58.com/web/invitation/getInvitationUrl`;
        let body = ``;
        let urlObject = populateUrlObject(url,this.cookie,body);
        await httpRequest('get',urlObject);
        let result = httpResult;
        if(!result) return;
        // console.log(JSON.stringify(result))
        if(result.code == 0) {
            const {withdrawAmount} = result.result;
            addNotifyStr(`账号[${this.index}-${this.nickName}]累计提现：${withdrawAmount}`);
        } else {
            addNotifyStr(`账号[${this.index}-${this.nickName}]累计提现查询失败: ${result.message}`);
        }
    }

}

!(async () => {
    if (typeof $request !== "undefined") {
        await GetRewrite();
    }else {
        getUserCookie();
        if(!(await checkEnv())) return;
        console.log('==========\n');
        console.log(`如果要自定义UA，请把UA填到wbtcUA里，现在使用的UA是：\n${userUA}`);

        // 设置了禁止推送时间段 以下时间段不做任务
        if (disableStartTime && disableEndTime) {
            const date = new Date();
            const dateTimes = date.getTime();
            const y = date.getFullYear(), m = date.getMonth() + 1, d = date.getDate();
            const year = `${y}-${m < 10 ? '0'+m : m}-${d < 10 ? '0'+d : d}`;

            const start = new Date(`${year} ${disableStartTime}`).getTime();
            const end   = new Date(`${year} ${disableEndTime}`).getTime();
            if (dateTimes > start && dateTimes<end) {
                console.log('设置了禁止推送时间段 以下时间段不做任务');
                return;
            }
        }

        console.log('\n======== 检查登录状态 ========');
        // 检查登录状态
        for(let user of userList) {
            await user.checkLogin();
            await $.wait(200);
        }

        userList = userList.filter(x=>{
            return x.login;
        });

        // console.log('\n======== 现金签到 ========');
        // for(let user of userList) {
        //     await user.oreMainpage(false);
        //     await $.wait(200);
        // }
        // for(let user of userList) {
        //     await user.cashSigninlist();
        //     // 未签到的去签到
        //     if (user.cashSign) {
        //         await $.wait(500);
        //         await user.cashSignin();
        //     }
        //     await $.wait(500);
        //     console.log(`\n`);
        // }
        //
        // console.log('\n======== 我的家签到 ========');
        // for(let user of userList) {
        //     // 查询我的家签到状态
        //     await user.houseSignStatus();
        //     await $.wait(500);
        //     console.log(`\n`);
        // }
        //
        // console.log('\n======== 新手奖励 ========');
        // for(let user of userList) {
        //     await user.newbieMaininfo();
        //     await $.wait(500);
        //     console.log(`\n`);
        // }
        //
        // console.log('\n======== 神奇矿山（挖矿） ========');
        // console.log('活动路径：我的->神奇矿->免费领矿石');
        // for(let user of userList) {
        //     // 神奇矿页面查询
        //     await user.getMineMaininfo();
        //     const cumulativeOre = Number(user.mineMaininfo?.superInfo?.cumulativeOre || 0).toFixed(2) || '0.00';
        //     const currentSceneLimit = Number(user.mineMaininfo?.superInfo?.currentSceneLimit);
        //     const dix = (currentSceneLimit - cumulativeOre).toFixed(2);
        //     addNotifyStr(`账号[${user.index}-${user.nickName}]已经开采${cumulativeOre}mg，再开采${dix}mg可领取${user.mineMaininfo?.superInfo?.thousandOreValue}元`);
        //     await $.wait(500);
        //
        //     // 神奇矿石离线矿石收取
        //     await user.offlineRevenue();
        //     await $.wait(500);
        //
        //     // 升级装备
        //     await user.upgrade();
        //     await $.wait(500);
        //
        //     // 雇佣临时矿工
        //     await user.doEmploy();
        //     await $.wait(200);
        //
        //     if (['1','2'].includes(user.runTask)) {
        //         // 吃鸡腿加速
        //         await user.doDrumstick();
        //         await $.wait(6000);
        //     }
        //
        //     // 唤醒金币矿工
        //     await user.doWakeupEmploy();
        //     await $.wait(500);
        //
        //     console.log(`\n`);
        // }
        //
        // // 未绑定微信账号不能参加
        // console.log('\n======== 小游戏：神奇矿山 ========');
        // for(let user of userList) {
        //     if (['1','2'].includes(user.runTask)) {
        //         // 查询神奇矿山主页
        //         await user.miningUserInfo();
        //         await $.wait(500);
        //         // 获取可偷矿列表，能偷就偷
        //         await user.getStrangerInfo();
        //         await $.wait(500);
        //         console.log(`\n`);
        //     }
        // }
        //
        // console.log('\n======== 小游戏：早起打卡 ========');
        // for(let user of userList) {
        //     // 查询神奇矿主页
        //     await user.oreMainpage(false);
        //     await $.wait(500);
        //     // 查询打卡状态
        //     await user.attendanceDetail();
        //     await $.wait(500);
        //     console.log(`\n`);
        // }
        //
        // console.log('\n======== 小游戏：低价竞拍 ========');
        // // 只有能提现账号才参加
        // for(let user of userList) {
        //     if (user.runTask == 1) {
        //         // 查询低价竞拍主页
        //         await user.auctionInfo();
        //         await $.wait(500);
        //         console.log(`\n`);
        //     }
        // }

        console.log('\n======== 金币任务 ========');
        // 未绑定微信账号不能参加
        if(curHour>=TASK_TIME[0] && curHour<TASK_TIME[1]) {
            console.log('\n查询任务...');

            for(let id of taskList) {
                console.log(`任务id为: ${id}`);
                console.log(`任务名称: ${taskListInfo[id].name}, 路径：${taskListInfo[id].path}`);
                for(let user of userList) {
                    if (['1','2'].includes(user.runTask)) {
                        // 查询任务列表
                        await user.getTaskList(id);
                        await $.wait(200);
                        console.log(`\n`);
                    }
                }
            }

            for(let user of userList) {

                //上面查询任务完成会把 需要做的 和已经做完呆领奖的放到数组里
                //优化 如果 a用户 数组大 b用户数组小 这样 maxTaskLen就会超出数组 ！！！！
                // maxTaskLen = getMax(user.task.length,maxTaskLen);  //需要任务的长度
                // maxRewardLen = getMax(user.reward.length,maxRewardLen);  //需要领奖的长度
                maxTaskLen =user.task.length;  //需要任务的长度
                maxRewardLen = user.reward.length;  //需要领奖的长度
                console.log('开始完成任务...');
                for(let i=0; i<maxTaskLen; i++) {
                    if (['1','2'].includes(user.runTask)) {
                        let item = user.task[i];
                       // console.log('开始完成任务,任务对象输出-----');
                       // console.log(JSON.stringify(item))
                        const taskIdStr = `${item.sceneId}-${item.taskId}`;
                        // 屏蔽任务
                        if (!shields.includes(taskIdStr)) {

                            // 做任务
                            const res = await user.doTask(item.sceneId,item.taskId);
                         
                           //  //一下是根据具体任务  划分的时间
                           //  if (WAIT_TASK15.includes(taskIdStr)) {
                           //      await $.wait(16000);
                           //  }                         // 等到25s
                           //   else if (WAIT_TASK25.includes(taskIdStr)) {
                           //      await $.wait(25000);
                           //  }
                           //
                           //
                           // //一下是根据模块大致划分的时间
                           //  // 以下sceneId分类下的任务运行时间间隔需大于10s,避免执行任务异常
                           //  if (WAIT_TASK10.includes(item.sceneId)) {
                           //      await $.wait(11000);
                           //  }
                           //  //// 以下sceneId分类下的任务运行时间间隔需大于20s,避免执行任务异常
                           //   if (WAIT_TASK20.includes(item.sceneId)) {
                           //      await $.wait(21000);
                           //  }
                           //  else{
                           //      //默认都等16 秒 防止更新任务总是自己修改
                           //      await $.wait(16000);
                           //  }
                            //全部都等25秒-------防止新增任务还要修改 但是会增加任务时间
                            await $.wait(25000);
                               // 领取任务奖励
                            res && await user.getReward(item.sceneId,item.taskId);


                        } else {
                            console.log(`任务${taskIdStr}已被屏蔽，跳过`);
                        }
                        console.log(`\n`);
                        await $.wait(1000);
                    }

                }
                console.log('\n领取奖励...');
                for(let i=0; i<maxRewardLen; i++) {
                    if (['1','2'].includes(user.runTask)) {
                        let item = user.reward[i];
                        // 领取任务奖励
                        await user.getReward(item.sceneId,item.taskId);
                        await $.wait(500);
                        console.log(`\n`);
                    }
                    await $.wait(1000);
                }
            }

        } else {
            console.log(`${TASK_TIME[0]}点到${TASK_TIME[1]}点之间会做金币任务`);
        }

        // console.log('\n======== 首页签到再赚矿石 ========');
        // for(let user of userList) {
        //     await user.doHomeContinueTask();
        //     console.log(`\n`);
        // }

        console.log('\n======== 查询账户 ========');
        for(let user of userList) {
            await user.oreMainpage(true);
            await $.wait(300);
            await user.getWalletInfo();
            await $.wait(300);
            await user.getInvitationUrl();
            console.log(`\n`);
        }

        showmsg();

    }
})()
    .catch((e) => $.logErr(e))
    .finally(() => $.done());




///////////////////////////////////////////////////////////////////
function compare(property){
    return function(a,b){
        var value1 = a[property];
        var value2 = b[property];
        return value2 - value1;
    };
}
async function getUserCookie () {
    if (userCookie) return;
    userCookie = '';
    const ckStr = process.env.globalConf;
    if (ckStr) {
        const ckInfo = JSON.parse(ckStr) || {};
        const list = ckInfo[ckkey]?.cks || [];
        for (let i = 0; i < list.length; i++) {
            const {ck, runState, splitor} = list[i];
            userCookie+=`${ck}#${runState}${splitor}`;
        }

        disableStartTime = ckInfo[ckkey]?.disableStartTime || '';
        disableEndTime = ckInfo[ckkey]?.disableEndTime || '';
    }
}
async function checkEnv() {
    if(userCookie) {
        for(let userCookies of userCookie.split('@')) {
            if(userCookies) userList.push(new UserInfo(userCookies));
        }
        userCount = userList.length;
    } else {
        console.log('未找到wbtcCookie');
        return;
    }

    console.log(`共找到${userCount}个账号`);
    return true;
}

async function GetRewrite() {
    if($request.url.indexOf('getIndexSignInInfo') > -1) {
        let ppu = $request.headers.ppu ? $request.headers.ppu : $request.headers.PPU;
        if(!ppu) return;
        let uid = ppu.match(/UID=(\w+)/)[1];
        let ck = 'PPU=' + ppu;

        if(userCookie) {
            if(userCookie.indexOf('UID='+uid) == -1) {
                userCookie = userCookie + '@' + ck;
                $.setdata(userCookie, 'wbtcCookie');
                ckList = userCookie.split('@');
                $.msg(jsname+` 获取第${ckList.length}个wbtcCookie成功: ${ck}`);
            } else {
                console.log(jsname+` 找到重复的wbtcCookie，准备替换: ${ck}`);
                ckList = userCookie.split('@');
                for(let i=0; i<ckList.length; i++) {
                    if(ckList[i].indexOf('UID='+uid) > -1) {
                        ckList[i] = ck;
                        break;
                    }
                }
                userCookie = ckList.join('@');
                $.setdata(userCookie, 'wbtcCookie');
            }
        } else {
            $.setdata(ck, 'wbtcCookie');
            $.msg(jsname+` 获取第1个wbtcCookie成功: ${ck}`);
        }
    }
}

function addNotifyStr (str, log=true) {
    if (log) {
        console.log(`${str}\n`);
    }
    notifyStr+=`${str}\n`;
}

//通知
async function showmsg() {
    if (!(notifyStr && curHour==22 || notifyStr.includes('失败'))) return;
    notifyBody = jsname + "运行通知\n\n" + notifyStr;
    if (notifyFlag == 1) {
        $.msg(notifyBody);
        if($.isNode()){await notify.sendNotify($.name, notifyBody);}
    } else {
        console.log(notifyBody);
    }
}
////////////////////////////////////////////////////////////////////
function populateUrlObject(url,cookie,body=''){
    let host = (url.split('//')[1]).split('/')[0];
    let urlObject = {
        url: url,
        headers: {
            'Host' : host,
            'Cookie' : cookie,
            'Connection' : 'keep-alive',
            'Accept' : 'application/json, text/plain, */*',
            'User-Agent' : userUA,
            'Accept-Language' : 'zh-CN,zh-Hans;q=0.9',
            'Accept-Encoding' : 'gzip, deflate, br',
        },
    };
    if(body) urlObject.body = body;
    return urlObject;
}

async function httpRequest(method,url) {
    httpResult = null
    //let data;
    if (method == 'post') {
        url.headers['Content-Type'] = 'application/x-www-form-urlencoded'
        if (url.body) {
            url.headers['Content-Length'] = url.body.length
        } else {
            url.headers['Content-Length'] = 0
        }
    }
    if(method=='post'){
        //注意：post的headers不能写在请求体里面，在参数对象之前或之后都可以，再添加一个对象，然后声明headers;
        var {data} =await axios.post(url.url, url.body,{headers:url.headers} );
        httpResult = data
    }else{
        //可以看到post和get有着明显的区别，headers和参数是写在同一个对象之内的。只不过在对象之内又分开成两个对象参数
        var {data} =await axios.get(url.url,url);
        httpResult = data
    }
    //  httpResult = data.data
}

function safeGet(data) {
    try {
        if (data.includes('<!DOCTYPE html>')) {
            return true;
        }
        if (typeof JSON.parse(data) == "object") {
            return true;
        } else {
            console.log(data);
        }
    } catch (e) {
        console.log(e);
        console.log(`服务器访问数据为空，请检查自身设备网络情况`);
        return false;
    }
}

function getMin(a,b){
    return ((a<b) ? a : b);
}

function getMax(a,b){
    return ((a<b) ? b : a);
}

function padStr(num,length,padding='0') {
    let numStr = String(num);
    let numPad = (length>numStr.length) ? (length-numStr.length) : 0;
    let retStr = '';
    for(let i=0; i<numPad; i++) {
        retStr += padding;
    }
    retStr += numStr;
    return retStr;
}

function randomString(len=12) {
    let chars = 'abcdef0123456789';
    let maxLen = chars.length;
    let str = '';
    for (i = 0; i < len; i++) {
        str += chars.charAt(Math.floor(Math.random()*maxLen));
    }
    return str;
}

// 随机延时1-30s，避免大家运行时间一样
function delay () {
    let time = parseInt(Math.random()*100000);
    if (time > 30000) {// 大于30s重新生成
        return delay();
    } else{
        console.log('随机延时：', `${time}ms, 避免大家运行时间一样`);
        return time;// 小于30s，返回
    }
}

var Base64={_keyStr:"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",encode:function(e){var t="";var n,r,i,s,o,u,a;var f=0;e=Base64._utf8_encode(e);while(f<e.length){n=e.charCodeAt(f++);r=e.charCodeAt(f++);i=e.charCodeAt(f++);s=n>>2;o=(n&3)<<4|r>>4;u=(r&15)<<2|i>>6;a=i&63;if(isNaN(r)){u=a=64;}else if(isNaN(i)){a=64;}t=t+this._keyStr.charAt(s)+this._keyStr.charAt(o)+this._keyStr.charAt(u)+this._keyStr.charAt(a);}return t;},decode:function(e){var t="";var n,r,i;var s,o,u,a;var f=0;e=e.replace(/[^A-Za-z0-9+/=]/g,"");while(f<e.length){s=this._keyStr.indexOf(e.charAt(f++));o=this._keyStr.indexOf(e.charAt(f++));u=this._keyStr.indexOf(e.charAt(f++));a=this._keyStr.indexOf(e.charAt(f++));n=s<<2|o>>4;r=(o&15)<<4|u>>2;i=(u&3)<<6|a;t=t+String.fromCharCode(n);if(u!=64){t=t+String.fromCharCode(r);}if(a!=64){t=t+String.fromCharCode(i);}}t=Base64._utf8_decode(t);return t;},_utf8_encode:function(e){e=e.replace(/rn/g,"n");var t="";for(var n=0;n<e.length;n++){var r=e.charCodeAt(n);if(r<128){t+=String.fromCharCode(r);}else if(r>127&&r<2048){t+=String.fromCharCode(r>>6|192);t+=String.fromCharCode(r&63|128);}else{t+=String.fromCharCode(r>>12|224);t+=String.fromCharCode(r>>6&63|128);t+=String.fromCharCode(r&63|128);}}return t;},_utf8_decode:function(e){var t="";var n=0;var r=c1=c2=0;while(n<e.length){r=e.charCodeAt(n);if(r<128){t+=String.fromCharCode(r);n++;}else if(r>191&&r<224){c2=e.charCodeAt(n+1);t+=String.fromCharCode((r&31)<<6|c2&63);n+=2;}else{c2=e.charCodeAt(n+1);c3=e.charCodeAt(n+2);t+=String.fromCharCode((r&15)<<12|(c2&63)<<6|c3&63);n+=3;}}return t;}};

function MD5Encrypt(a){function b(a,b){return a<<b|a>>>32-b;}function c(a,b){var c,d,e,f,g;return e=2147483648&a,f=2147483648&b,c=1073741824&a,d=1073741824&b,g=(1073741823&a)+(1073741823&b),c&d?2147483648^g^e^f:c|d?1073741824&g?3221225472^g^e^f:1073741824^g^e^f:g^e^f;}function d(a,b,c){return a&b|~a&c;}function e(a,b,c){return a&c|b&~c;}function f(a,b,c){return a^b^c;}function g(a,b,c){return b^(a|~c);}function h(a,e,f,g,h,i,j){return a=c(a,c(c(d(e,f,g),h),j)),c(b(a,i),e);}function i(a,d,f,g,h,i,j){return a=c(a,c(c(e(d,f,g),h),j)),c(b(a,i),d);}function j(a,d,e,g,h,i,j){return a=c(a,c(c(f(d,e,g),h),j)),c(b(a,i),d);}function k(a,d,e,f,h,i,j){return a=c(a,c(c(g(d,e,f),h),j)),c(b(a,i),d);}function l(a){for(var b,c=a.length,d=c+8,e=(d-d%64)/64,f=16*(e+1),g=new Array(f-1),h=0,i=0;c>i;)b=(i-i%4)/4,h=i%4*8,g[b]=g[b]|a.charCodeAt(i)<<h,i++;return b=(i-i%4)/4,h=i%4*8,g[b]=g[b]|128<<h,g[f-2]=c<<3,g[f-1]=c>>>29,g;}function m(a){var b,c,d="",e="";for(c=0;3>=c;c++)b=a>>>8*c&255,e="0"+b.toString(16),d+=e.substr(e.length-2,2);return d;}function n(a){a=a.replace(/\r\n/g,"\n");for(var b="",c=0;c<a.length;c++){var d=a.charCodeAt(c);128>d?b+=String.fromCharCode(d):d>127&&2048>d?(b+=String.fromCharCode(d>>6|192),b+=String.fromCharCode(63&d|128)):(b+=String.fromCharCode(d>>12|224),b+=String.fromCharCode(d>>6&63|128),b+=String.fromCharCode(63&d|128));}return b;}var o,p,q,r,s,t,u,v,w,x=[],y=7,z=12,A=17,B=22,C=5,D=9,E=14,F=20,G=4,H=11,I=16,J=23,K=6,L=10,M=15,N=21;for(a=n(a),x=l(a),t=1732584193,u=4023233417,v=2562383102,w=271733878,o=0;o<x.length;o+=16)p=t,q=u,r=v,s=w,t=h(t,u,v,w,x[o+0],y,3614090360),w=h(w,t,u,v,x[o+1],z,3905402710),v=h(v,w,t,u,x[o+2],A,606105819),u=h(u,v,w,t,x[o+3],B,3250441966),t=h(t,u,v,w,x[o+4],y,4118548399),w=h(w,t,u,v,x[o+5],z,1200080426),v=h(v,w,t,u,x[o+6],A,2821735955),u=h(u,v,w,t,x[o+7],B,4249261313),t=h(t,u,v,w,x[o+8],y,1770035416),w=h(w,t,u,v,x[o+9],z,2336552879),v=h(v,w,t,u,x[o+10],A,4294925233),u=h(u,v,w,t,x[o+11],B,2304563134),t=h(t,u,v,w,x[o+12],y,1804603682),w=h(w,t,u,v,x[o+13],z,4254626195),v=h(v,w,t,u,x[o+14],A,2792965006),u=h(u,v,w,t,x[o+15],B,1236535329),t=i(t,u,v,w,x[o+1],C,4129170786),w=i(w,t,u,v,x[o+6],D,3225465664),v=i(v,w,t,u,x[o+11],E,643717713),u=i(u,v,w,t,x[o+0],F,3921069994),t=i(t,u,v,w,x[o+5],C,3593408605),w=i(w,t,u,v,x[o+10],D,38016083),v=i(v,w,t,u,x[o+15],E,3634488961),u=i(u,v,w,t,x[o+4],F,3889429448),t=i(t,u,v,w,x[o+9],C,568446438),w=i(w,t,u,v,x[o+14],D,3275163606),v=i(v,w,t,u,x[o+3],E,4107603335),u=i(u,v,w,t,x[o+8],F,1163531501),t=i(t,u,v,w,x[o+13],C,2850285829),w=i(w,t,u,v,x[o+2],D,4243563512),v=i(v,w,t,u,x[o+7],E,1735328473),u=i(u,v,w,t,x[o+12],F,2368359562),t=j(t,u,v,w,x[o+5],G,4294588738),w=j(w,t,u,v,x[o+8],H,2272392833),v=j(v,w,t,u,x[o+11],I,1839030562),u=j(u,v,w,t,x[o+14],J,4259657740),t=j(t,u,v,w,x[o+1],G,2763975236),w=j(w,t,u,v,x[o+4],H,1272893353),v=j(v,w,t,u,x[o+7],I,4139469664),u=j(u,v,w,t,x[o+10],J,3200236656),t=j(t,u,v,w,x[o+13],G,681279174),w=j(w,t,u,v,x[o+0],H,3936430074),v=j(v,w,t,u,x[o+3],I,3572445317),u=j(u,v,w,t,x[o+6],J,76029189),t=j(t,u,v,w,x[o+9],G,3654602809),w=j(w,t,u,v,x[o+12],H,3873151461),v=j(v,w,t,u,x[o+15],I,530742520),u=j(u,v,w,t,x[o+2],J,3299628645),t=k(t,u,v,w,x[o+0],K,4096336452),w=k(w,t,u,v,x[o+7],L,1126891415),v=k(v,w,t,u,x[o+14],M,2878612391),u=k(u,v,w,t,x[o+5],N,4237533241),t=k(t,u,v,w,x[o+12],K,1700485571),w=k(w,t,u,v,x[o+3],L,2399980690),v=k(v,w,t,u,x[o+10],M,4293915773),u=k(u,v,w,t,x[o+1],N,2240044497),t=k(t,u,v,w,x[o+8],K,1873313359),w=k(w,t,u,v,x[o+15],L,4264355552),v=k(v,w,t,u,x[o+6],M,2734768916),u=k(u,v,w,t,x[o+13],N,1309151649),t=k(t,u,v,w,x[o+4],K,4149444226),w=k(w,t,u,v,x[o+11],L,3174756917),v=k(v,w,t,u,x[o+2],M,718787259),u=k(u,v,w,t,x[o+9],N,3951481745),t=c(t,p),u=c(u,q),v=c(v,r),w=c(w,s);var O=m(t)+m(u)+m(v)+m(w);return O.toLowerCase();}

function Env(t,e){"undefined"!=typeof process&&JSON.stringify(process.env).indexOf("GITHUB")>-1&&process.exit(0);class s{constructor(t){this.env=t;}send(t,e="GET"){t="string"==typeof t?{url:t}:t;let s=this.get;return"POST"===e&&(s=this.post),"PUT"===e&&(s=this.put),new Promise((e,i)=>{s.call(this,t,(t,s,r)=>{t?i(t):e(s);});});}get(t){return this.send.call(this.env,t);}post(t){return this.send.call(this.env,t,"POST");}put(t){return this.send.call(this.env,t,"PUT");}}return new class{constructor(t,e){this.name=t,this.http=new s(this),this.data=null,this.dataFile="box.dat",this.logs=[],this.isMute=!1,this.isNeedRewrite=!1,this.logSeparator="\n",this.startTime=(new Date).getTime(),Object.assign(this,e),this.log("",`\ud83d\udd14${this.name}, \u5f00\u59cb!`);}isNode(){return"undefined"!=typeof module&&!!module.exports;}isQuanX(){return"undefined"!=typeof $task;}isSurge(){return"undefined"!=typeof $httpClient&&"undefined"==typeof $loon;}isLoon(){return"undefined"!=typeof $loon;}toObj(t,e=null){try{return JSON.parse(t);}catch{return e;}}toStr(t,e=null){try{return JSON.stringify(t);}catch{return e;}}getjson(t,e){let s=e;const i=this.getdata(t);if(i)try{s=JSON.parse(this.getdata(t));}catch{}return s;}setjson(t,e){try{return this.setdata(JSON.stringify(t),e);}catch{return!1;}}getScript(t){return new Promise(e=>{this.get({url:t},(t,s,i)=>e(i));});}runScript(t,e){return new Promise(s=>{let i=this.getdata("@chavy_boxjs_userCfgs.httpapi");i=i?i.replace(/\n/g,"").trim():i;let r=this.getdata("@chavy_boxjs_userCfgs.httpapi_timeout");r=r?1*r:20,r=e&&e.timeout?e.timeout:r;const[o,h]=i.split("@"),a={url:`http://${h}/v1/scripting/evaluate`,body:{script_text:t,mock_type:"cron",timeout:r},headers:{"X-Key":o,Accept:"*/*"}};this.post(a,(t,e,i)=>s(i));}).catch(t=>this.logErr(t));}loaddata(){if(!this.isNode())return{};{this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const t=this.path.resolve(this.dataFile),e=this.path.resolve(process.cwd(),this.dataFile),s=this.fs.existsSync(t),i=!s&&this.fs.existsSync(e);if(!s&&!i)return{};{const i=s?t:e;try{return JSON.parse(this.fs.readFileSync(i));}catch(t){return{};}}}}writedata(){if(this.isNode()){this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const t=this.path.resolve(this.dataFile),e=this.path.resolve(process.cwd(),this.dataFile),s=this.fs.existsSync(t),i=!s&&this.fs.existsSync(e),r=JSON.stringify(this.data);s?this.fs.writeFileSync(t,r):i?this.fs.writeFileSync(e,r):this.fs.writeFileSync(t,r);}}lodash_get(t,e,s){const i=e.replace(/\[(\d+)\]/g,".$1").split(".");let r=t;for(const t of i)if(r=Object(r)[t],void 0===r)return s;return r;}lodash_set(t,e,s){return Object(t)!==t?t:(Array.isArray(e)||(e=e.toString().match(/[^.[\]]+/g)||[]),e.slice(0,-1).reduce((t,s,i)=>Object(t[s])===t[s]?t[s]:t[s]=Math.abs(e[i+1])>>0==+e[i+1]?[]:{},t)[e[e.length-1]]=s,t);}getdata(t){let e=this.getval(t);if(/^@/.test(t)){const[,s,i]=/^@(.*?)\.(.*?)$/.exec(t),r=s?this.getval(s):"";if(r)try{const t=JSON.parse(r);e=t?this.lodash_get(t,i,""):e;}catch(t){e="";}}return e;}setdata(t,e){let s=!1;if(/^@/.test(e)){const[,i,r]=/^@(.*?)\.(.*?)$/.exec(e),o=this.getval(i),h=i?"null"===o?null:o||"{}":"{}";try{const e=JSON.parse(h);this.lodash_set(e,r,t),s=this.setval(JSON.stringify(e),i);}catch(e){const o={};this.lodash_set(o,r,t),s=this.setval(JSON.stringify(o),i);}}else s=this.setval(t,e);return s;}getval(t){return this.isSurge()||this.isLoon()?$persistentStore.read(t):this.isQuanX()?$prefs.valueForKey(t):this.isNode()?(this.data=this.loaddata(),this.data[t]):this.data&&this.data[t]||null;}setval(t,e){return this.isSurge()||this.isLoon()?$persistentStore.write(t,e):this.isQuanX()?$prefs.setValueForKey(t,e):this.isNode()?(this.data=this.loaddata(),this.data[e]=t,this.writedata(),!0):this.data&&this.data[e]||null;}initGotEnv(t){this.got=this.got?this.got:require("got"),this.cktough=this.cktough?this.cktough:require("tough-cookie"),this.ckjar=this.ckjar?this.ckjar:new this.cktough.CookieJar,t&&(t.headers=t.headers?t.headers:{},void 0===t.headers.Cookie&&void 0===t.cookieJar&&(t.cookieJar=this.ckjar));}get(t,e=(()=>{})){t.headers&&(delete t.headers["Content-Type"],delete t.headers["Content-Length"]),this.isSurge()||this.isLoon()?(this.isSurge()&&this.isNeedRewrite&&(t.headers=t.headers||{},Object.assign(t.headers,{"X-Surge-Skip-Scripting":!1})),$httpClient.get(t,(t,s,i)=>{!t&&s&&(s.body=i,s.statusCode=s.status),e(t,s,i);})):this.isQuanX()?(this.isNeedRewrite&&(t.opts=t.opts||{},Object.assign(t.opts,{hints:!1})),$task.fetch(t).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o);},t=>e(t))):this.isNode()&&(this.initGotEnv(t),this.got(t).on("redirect",(t,e)=>{try{if(t.headers["set-cookie"]){const s=t.headers["set-cookie"].map(this.cktough.Cookie.parse).toString();this.ckjar.setCookieSync(s,null),e.cookieJar=this.ckjar;}}catch(t){this.logErr(t);}}).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o);},t=>{const{message:s,response:i}=t;e(s,i,i&&i.body);}));}post(t,e=(()=>{})){if(t.body&&t.headers&&!t.headers["Content-Type"]&&(t.headers["Content-Type"]="application/x-www-form-urlencoded"),t.headers&&delete t.headers["Content-Length"],this.isSurge()||this.isLoon())this.isSurge()&&this.isNeedRewrite&&(t.headers=t.headers||{},Object.assign(t.headers,{"X-Surge-Skip-Scripting":!1})),$httpClient.post(t,(t,s,i)=>{!t&&s&&(s.body=i,s.statusCode=s.status),e(t,s,i);});else if(this.isQuanX())t.method="POST",this.isNeedRewrite&&(t.opts=t.opts||{},Object.assign(t.opts,{hints:!1})),$task.fetch(t).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o);},t=>e(t));else if(this.isNode()){this.initGotEnv(t);const{url:s,...i}=t;this.got.post(s,i).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o);},t=>{const{message:s,response:i}=t;e(s,i,i&&i.body);});}}put(t,e=(()=>{})){if(t.body&&t.headers&&!t.headers["Content-Type"]&&(t.headers["Content-Type"]="application/x-www-form-urlencoded"),t.headers&&delete t.headers["Content-Length"],this.isSurge()||this.isLoon())this.isSurge()&&this.isNeedRewrite&&(t.headers=t.headers||{},Object.assign(t.headers,{"X-Surge-Skip-Scripting":!1})),$httpClient.put(t,(t,s,i)=>{!t&&s&&(s.body=i,s.statusCode=s.status),e(t,s,i);});else if(this.isQuanX())t.method="PUT",this.isNeedRewrite&&(t.opts=t.opts||{},Object.assign(t.opts,{hints:!1})),$task.fetch(t).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o);},t=>e(t));else if(this.isNode()){this.initGotEnv(t);const{url:s,...i}=t;this.got.put(s,i).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o);},t=>{const{message:s,response:i}=t;e(s,i,i&&i.body);});}}time(t){let e={"M+":(new Date).getMonth()+1,"d+":(new Date).getDate(),"H+":(new Date).getHours(),"m+":(new Date).getMinutes(),"s+":(new Date).getSeconds(),"q+":Math.floor(((new Date).getMonth()+3)/3),S:(new Date).getMilliseconds()};/(y+)/.test(t)&&(t=t.replace(RegExp.$1,((new Date).getFullYear()+"").substr(4-RegExp.$1.length)));for(let s in e)new RegExp("("+s+")").test(t)&&(t=t.replace(RegExp.$1,1==RegExp.$1.length?e[s]:("00"+e[s]).substr((""+e[s]).length)));return t;}msg(e=t,s="",i="",r){const o=t=>{if(!t)return t;if("string"==typeof t)return this.isLoon()?t:this.isQuanX()?{"open-url":t}:this.isSurge()?{url:t}:void 0;if("object"==typeof t){if(this.isLoon()){let e=t.openUrl||t.url||t["open-url"],s=t.mediaUrl||t["media-url"];return{openUrl:e,mediaUrl:s};}if(this.isQuanX()){let e=t["open-url"]||t.url||t.openUrl,s=t["media-url"]||t.mediaUrl;return{"open-url":e,"media-url":s};}if(this.isSurge()){let e=t.url||t.openUrl||t["open-url"];return{url:e};}}};this.isMute||(this.isSurge()||this.isLoon()?$notification.post(e,s,i,o(r)):this.isQuanX()&&$notify(e,s,i,o(r)));let h=["","===========\ud83d\udce3\u7cfb\u7edf\u901a\u77e5\ud83d\udce3==========="];h.push(e),s&&h.push(s),i&&h.push(i),console.log(h.join("\n")),this.logs=this.logs.concat(h);}log(...t){t.length>0&&(this.logs=[...this.logs,...t]),console.log(t.join(this.logSeparator));}logErr(t,e){const s=!this.isSurge()&&!this.isQuanX()&&!this.isLoon();s?this.log("",`\u2757\ufe0f${this.name}, \u9519\u8bef!`,t.stack):this.log("",`\u2757\ufe0f${this.name}, \u9519\u8bef!`,t);}wait(t){return new Promise(e=>setTimeout(e,t));}done(t={}){const e=(new Date).getTime(),s=(e-this.startTime)/1e3;this.log("",`\ud83d\udd14${this.name}, \u7ed3\u675f! \ud83d\udd5b ${s} \u79d2`),this.log(),(this.isSurge()||this.isQuanX()||this.isLoon())&&$done(t);}}(t,e);}
