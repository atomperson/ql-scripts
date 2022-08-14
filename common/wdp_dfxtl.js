/*
东风雪铁龙

[task_local]
#东风雪铁龙
6 0,5,12,17 * * * wdp_dfxtl.js, tag=东风雪铁龙, enabled=true
*/
const jsname = '东风雪铁龙'
const $ = new Env('东风雪铁龙');
const logDebug = 0

const axios = require("axios");
const fs = require("fs");
// import axios from "axios";
// import fs from "fs";

let openflag = 1; //1为做任务（默认）  2为 查询积分信息和快递信息
let checkphoneFlag = false;// 是否 把账号错误的和正确的分开 并生成 phone1.json  和phone.json   默认false

const notifyFlag = 1; //0为关闭通知，1为打开通知,默认为1
const notify = $.isNode() ? require('./sendNotify') : '';

let notifyStr = ''
let notifyStr1 = ''
let httpResult //global buffer


let dfxtlphone = ($.isNode() ? process.env.dfxtlphone : $.getdata('dfxtlphone')) || '';
let dfxtlpassword = ($.isNode() ? process.env.dfxtlpassword : $.getdata('dfxtlpassword')) || '';
let Sign = ($.isNode() ? process.env.dfxtlSign : $.getdata('dfxtlSign')) || '';
let TimeStamp = ($.isNode() ? process.env.dfxtlTime : $.getdata('dfxtlTime')) || '';
let vins = ($.isNode() ? process.env.vins : $.getdata('vins')) || '';
let vinsArr = [];
let vinsindex = -1;


let changeFlag = false;
let dfxtlphoneArr = [];
let dfxtlTokenArr = [];
let vinArr = []; //vin 码数组
let ftqcArr = []; //ftqcArr
let ftqcArrindex = 1; //帖子随即开始数



let username = '';
let plArr = ['凡尔赛', '不错不错', '赞赞赞', '大多数人会希望你过好，但是前提条件是，不希望你过得比他好', '因你不同', '东风雪铁龙', '欣赏雪铁龙，加油棒棒哒', '66666', '加油，东风雪铁龙', '世界因你而存', '今生可爱与温柔，每一样都不能少', '远赴人间惊鸿宴，一睹人间盛世颜', '加油加油', 'upupUp', '东风雪铁龙，我的最爱', '赞赞赞'];
let imageArr = [];//图片资源
//let followlistArr = [];//关注人的集合
let followlistArr = ['1101368084441402773','1101369630629662206','1101368084441402570','1101388665924756926','1689fd661e5580c1d21b8838940f89b3']
let NewListArr = [];//最新的帖子的集合
let phoneErrorArr = [];//错误手机号集合
let phoneSuccessArr = [];//正确手机号集合
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
        console.log(`\n=============================================    \n脚本执行 - 北京时间(UTC+8)：${new Date(new Date().getTime() + new Date().getTimezoneOffset() * 60 * 1000 + 8 * 60 * 60 * 1000).toLocaleString()} \n=============================================\n`);
        //晚上9点默认赋值为做任务 类型
        if(curHour==21){
            openflag=1;
        }else{
            openflag=2;
        }
        //读取文件token    同步方法 不需要回调函数,出错直接抛出
        try {
            let fireData = fs.readFileSync("./userinfo.json", "utf-8");
            dfxtlTokenArr = JSON.parse(fireData);
        } catch (error) {
            console.log('文件读取错误' + error);
            return
        }
        //读取文件token    同步方法 不需要回调函数,出错直接抛出
        try {
            //hqdata.json  ftqctitle.json
            let fireData = fs.readFileSync("./hqdata.json", "utf-8");
            ftqcArr = JSON.parse(fireData);
            console.log('帖子数量为:【' + ftqcArr.length+'】\n');
            var aNumber = (ftqcArr.length) * Math.random();
            ftqcArrindex = Math.floor(aNumber);
        } catch (error) {
            console.log('文件读取错误' + error);
            return
        }
        var phoneset=new Set(dfxtlphoneArr);
        console.log('手机号数组数量：' + phoneset.size);
        console.log('token数组数量：' + dfxtlTokenArr.length);
        if (phoneset.size != dfxtlTokenArr.length) {
            console.log('手机变量与 token 数组不对应，请检查后再试！！！！！');
            return
        }
        console.log(`\nopenflag为${openflag} 执行操作为:【 ${(openflag==1?'账号做任务':'查询账号积分信息和快递信息')}】`)
        console.log(`checkphoneFlag为${checkphoneFlag} 执行操作为:【 ${(checkphoneFlag==true?'错误账号生成json文件':'错误账号不生成json文件')}】\n`)
        console.log(`\n=================== 共找到 ${dfxtlTokenArr.length} 个账号 ===================`)
        addNotifyStr1(`【=======查询用户订单信息=======】\n`, false)
        for (let index = 0; index < dfxtlTokenArr.length; index++) {
            var phone = '';
            phone = dfxtlTokenArr[index].phone;
            phone2 = dfxtlphoneArr[index];
            if (phone2 !=phone) {
                console.log(`第${index+1} 个token手机号与变量手机号不对应 \n dfxtlTokenArr:【 ${phone}】,dfxtlphoneArr:【 ${phone2}】`);
                continue;
            }
            // await $.wait(delay()); //  随机延时
            let num = index + 1;
            if (test100(index)) {
                console.log('\n============开始【第' + num + '个账号:' + phone + '】')
                console.log(`北京时间(UTC+8)：${new Date(new Date().getTime() + new Date().getTimezoneOffset() * 60 * 1000 + 8 * 60 * 60 * 1000).toLocaleString()} ======\n`);
                //break;
            }
            //token 校验  只是校验token是否正确
            if (await getSignStatus(dfxtlTokenArr[index].token)) {
                console.log(`【第 (${index + 1}) 个手机号:${phone},token失效】`);
                await dfxtllogin(index);
                changeFlag = true;
            }
            await $.wait(500);
            if (dfxtlTokenArr[index].token == '') {
                console.log(`【第 (${index + 1}) 个手机号:${phone},登录错误】`);
                //addNotifyStr(`【第 (${index + 1}) 个手机号:${phone},登录错误】`, true)
                phoneErrorArr.push(phone);//错误手机数组
                dfxtlTokenArr[index].score = 0;
                dfxtlTokenArr[index].scorenow = 0;
                dfxtlTokenArr[index].number = index + 1;
                continue;
            }
            //phoneSuccessArr.push(phone);//正确手机数组
            var token = dfxtlTokenArr[index].token;
            var userid = dfxtlTokenArr[index].userid
            if (openflag == 1) {
                await sign(token, userid);//签到
                await infoget(token, userid); //获取用户信息
                await queryChoicenessNewList(token,index);//评论任务  -------------查询最近的帖子
                await followList(token, userid,index); //发帖任务     ---------先从关注的用户随机取一个 用户  再从该用户随机取一个帖子复制
                await $.wait(2000);
            }
            var score = 0;
            var scorenow = 0;
            if (openflag == 2) {
                score = await scoreGet(token);//获取积分信息
                // addNotifyStr(`【第 (${index + 1}) 个手机号:${phone},积分:${score}】`, false)
                //任务完成情况-------//await taskList(token);
                scorenow = await scoreGetlist(token);//获取今日积分
                await getMyCarList(token, userid, phone);//获取vin 码信息
                await userOrderList(token, phone, index + 1); //商城订单信息
            }
            dfxtlTokenArr[index].score = score;
            dfxtlTokenArr[index].scorenow = scorenow;
            dfxtlTokenArr[index].number = index + 1;
        }
        //if (changeFlag) {
        if (false) {
            console.log("需要修改文件\n");
            //修改文件
            fs.writeFile("./userinfo.json", JSON.stringify(dfxtlTokenArr), (err) => {
                if (err) console.log(err);
                console.log("userinfo文件修改完成\n");
            })

        }
        await $.wait(500);
        if (openflag == 2) {
            addNotifyStr1(`\n【=======查询用户积分信息=======】\n`, false)
            dfxtlTokenArr.sort(function (x, y) {
                return y.score - x.score;
            });
            for (let i = 0; i < dfxtlTokenArr.length; i++) {
                addNotifyStr(`【第 (${dfxtlTokenArr[i].number}) 个手机号:${dfxtlTokenArr[i].phone},积分:${dfxtlTokenArr[i].score}】`, false)
                addNotifyStr('今日获取积分为：【' + dfxtlTokenArr[i].scorenow + '】', false);
            }
        }
        //是否生成 错误和 正确手机数组
        if (checkphoneFlag) {
            checkphone();
        }
        console.log("\n东风雪铁龙执行完成！！！！！！！！！！！\n");
        showmsg()

    }
})()
    .catch((e) => $.logErr(e))
    .finally(() => $.done())
/////---------------------------方法
//获取用户的车主人证
async function getMyCarList(token, userid,phone) {
    let url = `https://gateway-sapp.dpca.com.cn/api-m/v1/mycar/carOwnerOutlets/getMyCarList?phone=${phone}&userId=${userid}`;
    let body = ''
    let urlObject = populateUrlObject(url, token, body)
    await httpRequest('get', urlObject)
    let result = httpResult;
    if (!result) return
    if (result.code == 0) {
        var carList=result.data;
        if(carList.length>0){
            for(var i=0;i<carList.length;i++){
                var vin=carList[i].vin;
                console.log('已绑定vin码 【'+phone +'】,vin码个数【'+carList.length+'】')
                vinArr.push({
                    phone:phone,vin:vin
                })
            }
        }else {
            //console.log('暂无绑定 车辆信息')
            //await checkVinIsMatchCar(token, userid);//校验车主 绑定vin码信息
        }
    } else {
        console.log('获取用户的车主人证失败：' + result.message)
    }
}
//vin码校验
async function checkVinIsMatchCar(token, userid) {
    var vin='';
    vinsindex=vinsindex+1;
    for(;vinsindex<vinsArr.length;vinsindex++) {
        vin = vinsArr[vinsindex];
        console.log('vinsindex：' + vinsindex)
        console.log('vin：' + vin)

        let url = `https://gateway-sapp.dpca.com.cn/api-m/v1/mycar/carOwnerOutlets/checkVinIsMatchCar?vin=${vin}`;
        let body = '';
        let urlObject = populateUrlObject(url, token, body)
        await httpRequest('get', urlObject)
        let result = httpResult;
        if (!result) return
        if (result.code == 0) {
            console.log('第【' + vinsindex + '】个vin码校验成功：【' + vin + '】');
            await carOwnerOutletssave(token, userid, vin);//绑定车主
            return
        } else {
            console.log('第【'+vinsindex+'】个vin码校验失败：' +vin);
        }
    }
}
//绑定人证
async function carOwnerOutletssave(token, userId, vin) {
    let url = `https://gateway-sapp.dpca.com.cn/api-m/v1/mycar/carOwnerOutlets/save`;
    var plateNumber = await getPlate();
    let body = {
        "dealerId": "75528V",
        "fileUrl": "https://h5-sapp.dpca.com.cn/Loong-Citroen/images/Android/mmexport1660204659540.png",
        "isEnable": 0,
        "isTVehicle": "0",
        "plateNumber": plateNumber,
        "registrationDate": "null",
        "status": 0,
        "userId": userId,
        "vin": vin
    };
    let urlObject = populateUrlObject(url, token, body)
    await httpRequest('post', urlObject)
    let result = httpResult;
    if (!result) return
    if (result.code == 0) {
        console.log('vin:【'+vin+'】绑定人证成功')
    } else {
        console.log('vin:【'+vin+'】绑定人证成失败：' + result.message)
    }
}
//随机生成 车牌号码
function getPlate() {
    var shi = ["A", "B", "C"];
    var carId = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, "A", "B", "C", "D", "E", "F", "G", "H", "J", "K", "L", "M", "N", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"];
    //省号
    var sheng = ["京", "津", "沪", "渝", "冀", "吉", "辽", "黑", "湘", "鄂", "甘", "晋", "陕", "豫", "川", "云", "桂",
        "蒙", "贵", "青", "藏", "新", "宁", "粤", "琼", "闽", "苏", "浙", "赣", "鲁", "皖"];
    var shengi = parseInt(Math.random() * (sheng.length));
    var shiIndex = parseInt(Math.random() * 3);
    //console.debug ("随机生成 0-2 之间的数（包含 0 和 2）：" + shiIndex);
    var carNumber = sheng[shengi] + shi [shiIndex];
    //console.debug("随机生成车牌对焦点前面的内容：" + carNumber);
    for (var i = 0; i < 5; i++) {
        carNumber += carId[parseInt(Math.random() * carId.length - 1)];
    }
    console.log("生成的号牌是：" + carNumber);
    return carNumber;
}
async function checkphone(){
    //修改文件
    fs.writeFile("./phone1.json",
        JSON.stringify(phoneErrorArr),
        (err) => {
            if (err) console.log(err);
            console.log("文件修改完成1\n");
        })
    //修改文件
    fs.writeFile("./phone2.json",
        JSON.stringify(phoneSuccessArr),
        (err) => {
            if (err) console.log(err);
            console.log("文件修改完成2\n");
        });

    //修改文件
    fs.writeFile("./vin.json",
        JSON.stringify(vinArr),
        (err) => {
            if (err) console.log(err);
            console.log("vin文件文件修改完成2\n");
        });
}
// d东风雪铁龙登录
async function dfxtllogin(num) {
    var phone = '';
    phone = dfxtlTokenArr[num].phone;
    let url = `https://gateway-sapp.dpca.com.cn/api-u/v1/user/auth/loginForPwd`
    let body = {
        "pushId": "c36b3e0d6ffb4a88a332c9ab716f5d16",
        "password": dfxtlpassword,
        "areaCode": "",
        "pwdType": 1,
        "deviceId": "c36b3e0d6ffb4a88a332c9ab716f5d16",
        "account": phone,
    };
    //console.log('登录获取token')
    let urlObject = populateUrlObject(url, '', body)
    await httpRequest('post', urlObject)
    let result = httpResult;
    if (!result) {
        dfxtlTokenArr[num].token = '';
        return
    }
    if (result.code == 0) {
        dfxtlTokenArr[num].token = result.data.tokenValue;
        dfxtlTokenArr[num].userid = result.data.userInfoVo.id;
        console.log('token从新获取成功！！！')
    } else {
        console.log('登录失败：' + result.message)
        dfxtlTokenArr[num].token = '';
    }
}

async function sign(token, userid) {
    let url = `https://gateway-sapp.dpca.com.cn/api-u/v1/user/sign/sureNew?userId=` + userid;
    let body = ''
    let urlObject = populateUrlObject(url, token, body)
    await httpRequest('get', urlObject)
    let result = httpResult;
    if (!result) return
    //console.log(JSON.stringify(result))
    if (result.code == 0) {
        // console.log('签到成功')
    } else {
        // console.log('签到失败：' + result.message)
    }
}

//获取用户信息
async function infoget(token, userid) {
    let url = 'https://gateway-sapp.dpca.com.cn/api-u/v1/user/info/get';
    let body = ''
    let urlObject = populateUrlObject(url, token, body)
    await httpRequest('get', urlObject)
    let result = httpResult;
    if (!result) return
    //console.log(JSON.stringify(result))
    if (result.code == 0) {
        username = result.data.nickName;
    } else {
        // console.log('签到失败：' + result.message)
    }
}

async function getSignStatus(token) {
    let url = `https://gateway-sapp.dpca.com.cn/api-u/v1/user/sign/getSignStatus`;
    let body = ''
    let urlObject = populateUrlObject(url, token, body)
    await httpRequest('get', urlObject)
    let result = httpResult;
    if (result.code == 0) {
        return false;
    } else {
        return true;
    }
}


//评论消息
async function putComment(token, data,index) {

    var plle = plArr.length;
    var aNumber = (plle) * Math.random();
    var aNumber1 = Math.floor(aNumber);
    data.commentContent = plArr[aNumber1];//随机评论

    let url = `https://gateway-sapp.dpca.com.cn/api-c/v1/community/comment/putComment`
    let body = data;
    let urlObject = populateUrlObject(url, token, body)
    await httpRequest('post', urlObject)
    let result = httpResult;
    if (!result) return
    //console.log(JSON.stringify(result))
    if (result.code == 0) {
        // console.log('评论消息成功！！！')
        phoneSuccessArr.push(dfxtlphoneArr[index]);//正确手机数组
    } else {
        phoneErrorArr.push(dfxtlphoneArr[index]);//错误手机数组
        // console.log('评论消息失败：' + result.message)

    }
}

//查询最近更新的帖子 以前逻辑为取最新的10条 发现他这个更新慢 所有优化取100条然后随机4条
async function queryChoicenessNewList(token,idttt) {
    if (NewListArr.length == 0) {
        //1102626767558049804
        let url = `https://gateway-sapp.dpca.com.cn/api-c/v1/community/infoFlow/queryChoicenessNewList`
        let body = {"pageNum": "1", "pageSize": "300"};//一次查100条
        let urlObject = populateUrlObject(url, token, body)
        await httpRequest('post', urlObject)
        let result = httpResult;
        if (!result) return
        //console.log(JSON.stringify(result))
        if (result.code == 0) {
            // console.log('最近帖子 查询需要评论的帖子成功！！！')
            NewListArr = result.data.list;
        } else {
            console.log('通过主题id 查询需要评论的帖子失败：' + result.message)
        }
    }
    var data = NewListArr;
    for (let index = 0; index < 1; index++) {//一次评价4条
        var aNumber = (200) * Math.random();
        var aNumber1 = Math.floor(aNumber);//0-100随机取一条
        var conectTemId = data[aNumber1].id;
        var pickType = data[aNumber1].chonicenessType;

        var aa = {
            "bbsFileList": [],
            "commentContent": "加油雪铁龙",
            "commentParentId": "",
            "commentTemId": conectTemId,
            "commentTemType": pickType,
            "ids": "",
            "pageNum": 0,
            "pageSize": 0,
            "parentId": "",
            "replyName": "",
            "sendMsgType": 0
        }
        await putComment(token, aa,idttt);
        await $.wait(500);
    }

}


//查询 账号关注的用户数量
async function followList(token, userid,index) {
    // 关注人数的数组
    if (followlistArr.length == 0) {
        let url = `https://gateway-sapp.dpca.com.cn/api-u/v1/user/follow/followList`
        let body = {"pageNum": "1", "pageSize": "100", "userId": "1110115713052827653"}; //主账号157得关注 写死
        let urlObject = populateUrlObject(url, token, body)
        await httpRequest('post', urlObject)
        let result = httpResult;
        if (!result) return
        // console.log(JSON.stringify(result))
        if (result.code == 0) {
            // console.log('查询 账号关注的用户数量成功！！！');
            var followlistArrddd = result.data.list;
            followlistArr = followlistArrddd.map(ele => {
                return ele.userId;
            })
        } else {
            console.log('查询 账号关注的用户数量失败：' + result.message)
        }
    } else {
        //console.log('使用已经查询账号关注的用户！！！');
    }
    await $.wait(500);
    var followlistNo = Math.floor((followlistArr.length) * Math.random());//随机取一名关注的用户
    var otherid = followlistArr[followlistNo];//随机用户id
    //随机 关注
    await attention(token, otherid)
    //console.log(JSON.stringify(otherid));
    //查询该用户的帖子信息
    await queryChoicenessByUserDTO(token, userid, otherid,index)

}

//查询某个用户发帖数
async function queryChoicenessByUserDTO(token, userid, otherid,index) {
    //如果图片有数据则查询20条 第一次查询需查询多点 这样可以图片多
    var pageSize = 30;
    if (imageArr.length == 0) {
        pageSize = 500;
    }
    let url = `https://gateway-sapp.dpca.com.cn/api-c/v1/community/infoFlow/queryChoicenessByUserDTO`
    let body = {"pageNum": "1", "pageSize": pageSize, "userId": otherid};
    let urlObject = populateUrlObject(url, token, body)
    await httpRequest('post', urlObject)
    let result = httpResult;
    if (!result) return
    //console.log(JSON.stringify(result))
    if (result.code == 0) {
        // console.log('查询某个用户发帖数成功！！！')
        var total = result.data.total;
        //组织随机图片数据------------------------
        if (imageArr.length == 0) {
            for (var i = 0; i < total; i++) {
                var imagelist = result.data.list[i].fileVOList;
                if (imagelist.length > 0) {
                    for (var j = 0; j < imagelist.length; j++) {
                        imageArr.push(imagelist[j].fileAddress);
                    }
                }
            }
        }
        var aNumber = (result.data.list.length) * Math.random();
        var aNumber1 = Math.floor(aNumber);
        //获取随机数据 该用户的某个帖子
        var infoData = result.data.list[aNumber1];
        //喜欢
        await like(token,infoData.id)
        //收藏
        await collect(token,infoData.id)
        var random123=index%2;
        for(var i=0;i<3;i++){
            //调整为一次发三个 省事
            if(random123==0){
                var imageNo = Math.floor((imageArr.length) * Math.random());//随机图片数据
                infoData.imageUrl = imageArr[imageNo];//随机图片url
                await publishPosts_copy(token, infoData, userid,index)
                await $.wait(500);
                //从新随机 帖子
                 aNumber1 = Math.floor((result.data.list.length) * Math.random());
                infoData = result.data.list[aNumber1];
            }else if(random123==1){
                await publishPostsNew(token, '', userid,index)
                await $.wait(500);
            }else{
            }
        }
        await $.wait(5000);
    } else {
        console.log('发表帖子失败：' + result.message+'手机号：'+dfxtlphoneArr[index])

    }
}


//发表帖子---
async function publishPostsNew(token, data1, userid,index) {
    var ftqcArrindex1=ftqcArrindex%ftqcArr.length;
    var ftqcdata =ftqcArr[ftqcArrindex1];
    var aa2 = ' {"content":"","postsType":0,"pickType":1,"paragraphs":[{"paragraphContent":"","paragraphType":0}],"topicVOList":[{"contentCount":4817,"fileVOList":[{"createBy":"17","createDate":"2022-07-13 03:25:01","fileAddress":"https://h5-sapp.dpca.com.cn/46ac56e37a0944cdb01051028b2b9673.jpg","fileAddressSmall":"https://h5-sapp.dpca.com.cn/46ac56e37a0944cdb01051028b2b9673.jpg?imageView2/1/q/85","fileTemId":"1089045376593117191","fileTemType":"2","fileType":"0","id":"1101547940492624005","isEnable":"1","publishTime":"2022-07-13 03:25:01","publisher":"孙焕辰","sourceApp":"DC","sourceType":"SYSTEM","updateTime":"2022-07-13 03:25:01"}],"id":"1089045376593117191","selectedType":2,"title":"生活有你 爱有天逸"}],"atUserList":[],"bbsFile":[{"compressPath":"https://h5-sapp.dpca.com.cn/Loong-Citroen/images/Android/vctacywba1658634321334.jpg","createBy":"1110135246564106277","fileAddress":"https://h5-sapp.dpca.com.cn/Loong-Citroen/images/Android/vctacywba1658634321334.jpg","fileAddressSmall":"https://h5-sapp.dpca.com.cn/Loong-Citroen/images/Android/vctacywba1658634321334.jpg","fileTemType":6,"fileType":0,"isSelectPic":false,"localPath":"/storage/emulated/0/Pictures/WeiXin/mmexport1658634024185.jpg"}],"userId":"1110135246564106277","sourceApp":"DC","sourceType":"ANDROID","coordinateDto":{"address":"","latitude":"","longitude":""},"title":""}';
    var data = JSON.parse(aa2);
    data.content =ftqcdata.content
    var str2 = data.content.replace("<p>", "").replace("</p>", "");
    data.paragraphs.paragraphContent = str2;//去掉p 标签
    data.title =ftqcdata.title ;
    data.userId = userid;
    var bbsFile=[]
    for(var t=0;t<ftqcdata.images.length;t++){
        bbsFile.push({
            createBy:userid,
            compressPath:ftqcdata.images[t],
            fileAddress:ftqcdata.images[t],
            fileAddressSmall:ftqcdata.images[t]
            ,"fileTemType":6,
            "fileType":0,
            "isSelectPic":false,
            "localPath":"/storage/emulated/0/Pictures/WeiXin/mmexport1658634024185.jpg"
        })
    }
    data.bbsFile=bbsFile;
    let url = `https://gateway-sapp.dpca.com.cn/api-c/v1/community/posts/publishPostsNew`
    let body = data;
    let urlObject = populateUrlObject(url, token, body)
    await httpRequest('post', urlObject)
    let result = httpResult;
    if (!result) return
    //console.log(JSON.stringify(result))
    if (result.code == 0) {
        //console.log('第'+(index+1)+'个 手机【'+dfxtlphoneArr[index]+'】，发表帖子成功！！！')
    } else {
        //console.log('第'+(index+1)+'个 手机【'+dfxtlphoneArr[index]+'】，发表帖子失败\n')
        console.log('【'+dfxtlphoneArr[index]+'】发表帖子失败：' + result.message)
    }
    ftqcArrindex++;
}

//发表帖子---
async function publishPosts_copy(token, data1, userid,index) {
    var aa2 = ' {"content":"","postsType":0,"pickType":1,"paragraphs":[{"paragraphContent":"","paragraphType":0}],"topicVOList":[{"contentCount":4817,"fileVOList":[{"createBy":"17","createDate":"2022-07-13 03:25:01","fileAddress":"https://h5-sapp.dpca.com.cn/46ac56e37a0944cdb01051028b2b9673.jpg","fileAddressSmall":"https://h5-sapp.dpca.com.cn/46ac56e37a0944cdb01051028b2b9673.jpg?imageView2/1/q/85","fileTemId":"1089045376593117191","fileTemType":"2","fileType":"0","id":"1101547940492624005","isEnable":"1","publishTime":"2022-07-13 03:25:01","publisher":"孙焕辰","sourceApp":"DC","sourceType":"SYSTEM","updateTime":"2022-07-13 03:25:01"}],"id":"1089045376593117191","selectedType":2,"title":"生活有你 爱有天逸"}],"atUserList":[],"bbsFile":[{"compressPath":"https://h5-sapp.dpca.com.cn/Loong-Citroen/images/Android/vctacywba1658634321334.jpg","createBy":"1110135246564106277","fileAddress":"https://h5-sapp.dpca.com.cn/Loong-Citroen/images/Android/vctacywba1658634321334.jpg","fileAddressSmall":"https://h5-sapp.dpca.com.cn/Loong-Citroen/images/Android/vctacywba1658634321334.jpg","fileTemType":6,"fileType":0,"isSelectPic":false,"localPath":"/storage/emulated/0/Pictures/WeiXin/mmexport1658634024185.jpg"}],"userId":"1110135246564106277","sourceApp":"DC","sourceType":"ANDROID","coordinateDto":{"address":"","latitude":"","longitude":""},"title":""}';
    var data = JSON.parse(aa2);
    data.content = data1.content;
    var str2 = data1.content.replace("<p>", "").replace("</p>", "");
    data.paragraphs.paragraphContent = str2;//去掉p 标签
    data.title = data1.title;
    data.userId = userid;
    data.bbsFile[0].createBy = userid;
    data.bbsFile[0].compressPath = data1.imageUrl;//图片影像
    data.bbsFile[0].fileAddress = data1.imageUrl;//图片影像
    data.bbsFile[0].fileAddressSmall = data1.imageUrl;//图片影像

    //图片随机 TOdo
    let url = `https://gateway-sapp.dpca.com.cn/api-c/v1/community/posts/publishPostsNew`
    let body = data;
    let urlObject = populateUrlObject(url, token, body)
    await httpRequest('post', urlObject)
    let result = httpResult;
    if (!result) return
    //console.log(JSON.stringify(result))
    if (result.code == 0) {
        //  console.log('发表帖子成功！！！,主题为:' + data1.title)
    } else {
        console.log('发表帖子失败：' + result.message+'手机号：'+dfxtlphoneArr[index])

    }
}


//查询积分
async function scoreGet(token) {
    let url = `https://gateway-sapp.dpca.com.cn/api-u/v1/user/score/get`
    let body = '';
    let urlObject = populateUrlObject(url, token, body)
    await httpRequest('get', urlObject)
    let result = httpResult;
    if (!result) return
    //console.log(JSON.stringify(result))
    if (result.code == 0) {
        // console.log('积分查询成功,积分剩余为'+result.data.usableScore)
        return result.data.usableScore;
    } else {
        console.log('发表帖子失败：' + result.message)

    }
}
//收藏
async function collect(token,id) {
    let url = `https://gateway-sapp.dpca.com.cn/api-c/v1/community/bbsCollect/collect`
    let body = {"collectTemId":id,"collectTemType":"6"};
    let urlObject = populateUrlObject(url, token, body)
    await httpRequest('post', urlObject)
    let result = httpResult;
    if (!result) return
    if (result.code == 0) {
        // console.log('收藏成功')
    } else {
        //  console.log('收藏失败：' + result.message)
    }
}
//关注
async function attention(token,id) {
    let url = `https://gateway-sapp.dpca.com.cn/api-u/v1/user/follow/attention`
    let body = {"followedId":id};
    let urlObject = populateUrlObject(url, token, body)
    await httpRequest('post', urlObject)
    let result = httpResult;
    if (!result) return
    if (result.code == 0) {
        // console.log('关注成功')
    } else {
        // console.log('关注失败：' + result.message)
    }
}
//关注
async function like(token,id) {
    let url = `https://gateway-sapp.dpca.com.cn/api-c/v1/community/bbsLike/like`
    let body = {"collectTemId":id,"collectTemType":"6"};
    let urlObject = populateUrlObject(url, token, body)
    await httpRequest('post', urlObject)
    let result = httpResult;
    if (!result) return
    if (result.code == 0) {
        //console.log('点赞成功')
    } else {
        // console.log('点赞失败：' + result.message)
    }
}
//查询积分记录
async function scoreGetlist(token) {
    let url = `https://gateway-sapp.dpca.com.cn/api-u/v1/user/score/list`
    let body = {"pageSize": 15, "pageNum": 1, "operateType": 1};
    let urlObject = populateUrlObject(url, token, body)
    await httpRequest('post', urlObject)
    let result = httpResult;
    if (!result) return
    //console.log(JSON.stringify(result))
    var scorenow = 0;
    var scoreamoun1 = 0;
    if (result.code == 0) {
        var datlist = result.data.list;
        var nowdata = getDate(1);
        datlist.filter(ele => {
            if (ele.createTime.split(' ')[0] == nowdata) {
                return true
            } else {
                return false;
            }
        }).map(ele => {
            scorenow += ele.score;
        })
        return scorenow;
        //addNotifyStr('今日获取积分为：【' + scorenow + '】', false);
        var nowdata2 = getDate(2);
        datlist.filter(ele => {
            if (ele.createTime.split(' ')[0] == nowdata2) {
                return true
            } else {
                return false;
            }
        }).map(ele => {
            scoreamoun1 += ele.score;
        })
        //addNotifyStr('昨日获取积分为：【' + scoreamoun1+'】',false);
    } else {
        console.log('查询积分记录失败：' + result.message)
    }
}

//查询任务完成情况
async function taskList(token) {
    let url = `https://gateway-sapp.dpca.com.cn/api-u/v1/user/member/taskList`
    let body = '';
    let urlObject = populateUrlObject(url, token, body)
    await httpRequest('get', urlObject)
    let result = httpResult;
    if (!result) return
    //console.log(JSON.stringify(result))
    if (result.code == 0) {
        // console.log('查询任务完成情况成功！！！');
        //日常任务  typeId=‘2’
        var qichangtask = result.data.typeTaskList[0];
        let taskinfo = qichangtask.taskList.filter(ele => {
            //37为评论  17为每日签到   4为参与热门发帖  5 发帖内容加精
            return ele.id == '37' || ele.id == '17' || ele.id == '4'
        }).map(el2 => {
            return {
                'name': el2.name,
                'isfinish': (el2.isFinish == 1 ? '已完成' : '未完成'),
                'total': el2.currentTaskCount + '/' + el2.limitScore
            };
        })
        // addNotifyStr('任务完成情况:',false);
        for (let index = 0; index < taskinfo.length; index++) {
            addNotifyStr(`${taskinfo[index].name}:${taskinfo[index].isfinish}(${taskinfo[index].total})`, false)
        }
    } else {
        console.log('查询任务完成情况失败：' + result.message)

    }
}

//查询商城订单
async function userOrderList(token, phone, index) {
    let url = `https://gateway-sapp.dpca.com.cn/api-mall/v1/mall/app/userOrder/list?orderStatus=&pageNum=1&pageSize=10&sourceApp=DC`
    let body = '';
    let urlObject = populateUrlObject(url, token, body)
    await httpRequest('get', urlObject)
    let result = httpResult;
    if (!result) return
    //console.log(JSON.stringify(result))
    if (result.code == 0) {
        // console.log('查询商城订单成功！！！');
        var total = result.data.total;
        var list2 = result.data.list;
        var list=list2.filter(ele=>{
            if( ele.orderStatusDetailStr=='已发货'||ele.orderStatusDetailStr=='代发货'){
                return true;
            }else{
                return  false;
            }
        })
        if (list.length > 0) {
            addNotifyStr1(`\n=======第【${index}】个手机号【${phone}】======`, false)
            for (var j = 0; j < list.length; j++) {
                var skuName = list[j].skuName;
                var orderStatusDetailStr = list[j].orderStatusDetailStr;
                if (orderStatusDetailStr == '已发货') {
                    addNotifyStr1(`【${j + 1}】:商品名称:【${skuName}】:【${orderStatusDetailStr}】`, false)
                    var id = list[j].id;
                    await getLogisticsTrackMapInfo(token, id)
                } else if (orderStatusDetailStr == '代发货') {
                    addNotifyStr1(`【${j + 1}】:商品名称:【${skuName}】:【${orderStatusDetailStr}】`, false)
                }
            }
        }

    } else {
        console.log('查询商城订单失败：' + result.message)

    }
}

//查询商品详情  87ebbfb3cb036f9247e993a1401ec006
async function userCommodity(token, commodityId) {
    let url = `https://gateway-sapp.dpca.com.cn/api-mall/v1/mall/app/userCommodity/detail?commodityId=` + commodityId;
    let body = '';
    let urlObject = populateUrlObject(url, token, body)
    await httpRequest('get', urlObject)
    let result = httpResult;
    if (!result) return
    //console.log(JSON.stringify(result))
    if (result.code == 0) {
        // console.log('查询商城订单成功！！！');
        var total = result.data.total;
        addNotifyStr(`订单数量：【 ${total}【个`, false)
        var list = result.data.list;
        for (var j = 0; j < list.length; j++) {
            var skuName = list[j].skuName;
            var orderStatusDetailStr = list[j].orderStatusDetailStr;
            addNotifyStr(`[${j + 1}]:商品名称：${skuName} 状态：${orderStatusDetailStr}`, false)
        }
    } else {
        console.log('查询商城订单失败：' + result.message)

    }
}

//地址保存
async function saveUserAddress(token) {
    let url = 'https://gateway-sapp.dpca.com.cn/api-mall/v1/app/userAddress/saveUserAddress';
    let body = {
        "receiverName": "王先生",
        "receiverPhone": "19121901086",
        "address": "百尺竿镇 百尺杆村村东农村信用社",
        "isDefault": 0,
        "provinceName": "河北省",
        "provinceCode": "130000",
        "cityName": "保定市",
        "cityCode": "130600",
        "districtName": "涿州市",
        "districtCode": "130681"
    };
    let urlObject = populateUrlObject(url, token, body)
    await httpRequest('post', urlObject)
    let result = httpResult;
    if (!result) return
    //console.log(JSON.stringify(result))
    if (result.code == 0) {
        console.log('地址保存成功！！！');
    } else {
        console.log('地址保存失败：' + result.message)

    }
}

//快递信息
async function getLogisticsTrackMapInfo(token, orderid) {
    let url = 'https://gateway-sapp.dpca.com.cn/api-mall/v1/app/cainiao/getLogisticsTrackMapInfo/1/' + orderid;
    let body = '';
    let urlObject = populateUrlObject(url, token, body)
    await httpRequest('get', urlObject)
    let result = httpResult;
    if (!result) return
    //console.log(JSON.stringify(result))
    if (result.code == 0) {
        //console.log('快递信息查询成功！！！');
        var datainfo = result.data;
        var statis = datainfo.detail[0].logisticName;//发货状态
        var address = datainfo.addressInfo.address;//地址
        var receiverPhone = datainfo.addressInfo.receiverPhone;//手机
        var receiverName = datainfo.addressInfo.receiverName;//姓名
        addNotifyStr1(`地址：【${address}】`, false)
        addNotifyStr1(`收货人：【${receiverName}】,手机：【${receiverPhone}】`, false)
        addNotifyStr1(`单号：${datainfo.expressNo}`, false)
    } else {
        console.log('快递信息查询失败：' + result.message)

    }
}

///////////////////////////////////////////////////////////////////
//获取  1 今天   2 昨天
function getDate(type) {
    var myDate = '';
    if (type == 1) {
        myDate = new Date();
    } else {
        var time = (new Date).getTime() - 24 * 60 * 60 * 1000;
        myDate = new Date(time);
    }
    const getFullYear = myDate.getFullYear();
    const getMonth = myDate.getMonth() + 1 > 9 ? myDate.getMonth() + 1 : '0' + (myDate.getMonth() + 1);
    const date = myDate.getDate() > 9 ? myDate.getDate() : ("0" + myDate.getDate());
    const getHours = myDate.getHours();
    const getMinutes = myDate.getMinutes();
    const getSeconds = myDate.getSeconds();
    const t = getFullYear + '-' + getMonth + '-' + date;
    return t;
}

function isEmpty(val) {
    if (val === undefined || val === null || val === "") {
        return true;
    } else {
        var value = val.trim();
        if (value === "") {
            return true;
        }
        return false;
    }
}

async function Envs() {
    if (dfxtlphone) {
        if (dfxtlphone.indexOf("@") != -1) {
            dfxtlphone.split("@").forEach((item) => {
                dfxtlphoneArr.push(item);
            });
        } else if (dfxtlphone.indexOf("\n") != -1) {
            dfxtlphone.split("\n").forEach((item) => {
                dfxtlphoneArr.push(item);
            });
        } else {
            dfxtlphoneArr.push(dfxtlphone);
        }
    } else {
        log(`\n提示：未填写提现变量，不会执行自动提现`)
    }

    if (vins) {
        if (vins.indexOf("@") != -1) {
            vins.split("@").forEach((item) => {
                vinsArr.push(item);
            });
        } else if (vins.indexOf("\n") != -1) {
            vins.split("\n").forEach((item) => {
                vinsArr.push(item);
            });
        } else {
            vinsArr.push(vins);
        }
    } else {
        log(`\n提示：未填写提现变量，不会执行自动提现`)
    }



    return true;
}

async function GetRewrite() {
    if ($request.url.indexOf('getIndexSignInInfo') > -1) {
        let ppu = $request.headers.ppu ? $request.headers.ppu : $request.headers.PPU
        if (!ppu) return;
        let uid = ppu.match(/UID=(\w+)/)[1]
        let ck = 'PPU=' + ppu


    }
}

function addNotifyStr(str, log = true) {
    if (log) {
        console.log(`${str}\n`)
    }
    notifyStr += `${str}\n`
}

function addNotifyStr1(str, log = true) {
    notifyStr1 += `${str}\n`
}

//通知
async function showmsg() {
    // if (!(notifyStr && curHour == 22 || notifyStr.includes('失败'))) return
    notifyBody = jsname + "运行通知\n\n" + notifyStr1 + notifyStr
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

function test100(num) {
    var r = /^[1-9]\d*00$/;
    return r.test(num);
}

function populateUrlObject(url, cookie, body = '') {
    let host = (url.split('//')[1]).split('/')[0]
    let urlObject = {
        url: url, headers: {
            'Host': host,
            'Connection': 'keep-alive',
            'Accept': 'application/json, text/plain, */*',
            'User-Agent': 'okhttp/4.2.2',
            'Accept-Language': 'zh-CN,zh-Hans;q=0.9',
            'Accept-Encoding': 'gzip',
            "Secret": "8bc742859a7849ec9a924c979afa5a00",
            "Sign": Sign,
            "AppId": "IMD719278367448862",
            "SourceApp": "DC",
            "SourceType": "ANDROID",
            "SourceAppVer": "1.8.1",
            "TimeStamp": TimeStamp,
            "Authorization": cookie,
        },
    }
    if (body) urlObject.body = body
    return urlObject;
}

async function httpRequest(method, url) {
    httpResult = null
    //let data;
    if (method == 'post') {

    }
    url.headers['RequestType'] = 'GET';
    url.headers['Content-Type'] = 'application/json'
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

function safeGet(data) {
    try {
        if (typeof JSON.parse(data) == "object") {
            return true;
        } else {
            console.log(data)
        }
    } catch (e) {
        console.log(e);
        console.log(`服务器访问数据为空，请检查自身设备网络情况`);
        return false;
    }
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