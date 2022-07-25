/*
    东风雪铁龙

    [Script]
    cron "0 0,19 * * *" script-path=wdp_dfxtl.js, tag=东风雪铁龙, enabled=true
*/
const jsname = '东风雪铁龙'
const $ = Env('东风雪铁龙')
const logDebug = 0

const ckkey = 'wbtcCookie';
const axios = require("axios");
//import axios from "axios";

const notifyFlag = 1; //0为关闭通知，1为打开通知,默认为1
const notify = $.isNode() ? require('./sendNotify') : '';
let notifyStr = ''

let httpResult //global buffer

let userCookie = ($.isNode() ? process.env[ckkey] : $.getdata(ckkey)) || '';


let userUA = ($.isNode() ? process.env.gjzzUA : $.getdata('wbtcUA')) || 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 WUBA/10.26.5';
let userList = []

let dfxtlphone=process.env.dfxtlphone;
let dfxtlpassword=process.env.dfxtlpassword;
let Sign=process.env.dfxtlSign;   //app的sign 签名
let TimeStamp =process.env.dfxtlTime//app的sign 签名时间
// let dfxtlphone = '19121901086';
// let dfxtlpassword = 'q3wvHQn0/lwiRT2boRjztA==';
// let Sign = '4b6a5a5e092903efb696513ca25404d8018ef770d3d493d637c455e8b0a9daa0';
// let TimeStamp = '2068854542000';


let dfxtlphoneArr = [];
let dfxtlpasswordArr = [];
let dfxtlTokenArr = [];
let plArr = ['凡尔赛', '不错不错', '赞赞赞', '大多数人会希望你过好，但是前提条件是，不希望你过得比他好', '因你不同', '东风雪铁龙', '欣赏雪铁龙，加油棒棒哒', '66666', '加油，东风雪铁龙', '世界因你而存', '今生可爱与温柔，每一样都不能少', '远赴人间惊鸿宴，一睹人间盛世颜', '加油加油', 'upupUp', '东风雪铁龙，我的最爱', '赞赞赞'];
let imageArr=[];//图片资源

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
        console.log(`\n=================== 共找到 ${dfxtlphoneArr.length} 个账号 ===================`)
        // let dfxtlphoneArr dfxtlpasswordArr  dfxtlTokenArr
        for (let index = 0; index < dfxtlphoneArr.length; index++) {

            // await $.wait(delay()); //  随机延时
            let num = index + 1
            console.log(`\n========= 开始【第 ${num} 个账号】=========\n`)
            console.log('\n======== 检查登录状态 ========')
            //登录
            await dfxtllogin(index);
            await $.wait(200);
            var token = dfxtlTokenArr[index].tokenValue;
            var userid = dfxtlTokenArr[index].userInfoVo.id;

            //var token='ISOFTSTONE.eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiIxNTcyMDEwMTA4NiIsImF1dGgiOiIiLCJleHAiOjE2NTkxNTc2NDR9.APpGQySJT0S56tAyTyM56O6iy-De-PL79fKNgSC_N4SL9frXGMzfbIxPoPlxLN6wkxABscSy4PgtaEZOohj7Cw';
            console.log(`token为:\n ${token}`);
            //获取任务列表
            // await taskList(token);
            //签到
            // await sign(token,userid);
            //开始评论
            //await selectAdvertCarousel(token);
            //查询最近的帖子  -----查询评论
            // await queryChoicenessNewList(token,'1102626767558049804') ;
            console.log('\n============  ============')

            //发表帖子
           // await pushtizi(token, userid);
            await queryChoicenessByUserDTO(token, userid,'1083380194470035815');




        }


        showmsg()
    }
})()
    .catch((e) => $.logErr(e))
    .finally(() => $.done())


/////---------------------------方法
// let dfxtlphoneArr = [];  // let dfxtlpasswordArr = [];
// d东风雪铁龙登录
async function dfxtllogin(num) {
    let url = `https://gateway-sapp.dpca.com.cn/api-u/v1/user/auth/loginForPwd`
    let body = {
        "pushId": "c36b3e0d6ffb4a88a332c9ab716f5d16",
        "password": dfxtlpasswordArr[num],
        "areaCode": "",
        "pwdType": 1,
        "deviceId": "c36b3e0d6ffb4a88a332c9ab716f5d16",
        "account": dfxtlphoneArr[num]
    };
    console.log('登录获取token')
    let urlObject = populateUrlObject(url, '', body)
    await httpRequest('post', urlObject)
    let result = httpResult;
    if (!result) return
    // console.log(JSON.stringify(result))
    if (result.code == 0) {
        console.log('登录成功！');
        dfxtlTokenArr[num] = result.data;
    } else {
        console.log('登录失败：' + result.message)

    }
}

async function taskList(token) {
    let url = `https://gateway-sapp.dpca.com.cn/api-u/v1/user/member/taskList`
    let body = ''
    let urlObject = populateUrlObject(url, token, body)
    await httpRequest('get', urlObject)
    let result = httpResult;
    if (!result) return
    //console.log(JSON.stringify(result))
    if (result.code == 0) {
        console.log('任查询成功')
    } else {
        console.log('登录失败：' + result.message)

    }
}

async function sign(token, userid) {
    let url = `https://gateway-sapp.dpca.com.cn/api-u/v1/user/sign/sureNew?userId=` + userid;
    let body = ''
    let urlObject = populateUrlObject(url, token, body)
    await httpRequest('get', urlObject)
    let result = httpResult;
    if (!result) return
    console.log(JSON.stringify(result))
    if (result.code == 0) {
        console.log('签到成功')
    } else {
        console.log('登录失败：' + result.message)

    }
}

//评论列表查询
async function selectAdvertCarousel(token) {
    let url = `https://gateway-sapp.dpca.com.cn/api-c/v1/community/advertising/selectAdvertCarousel?pushPosition=1`
    let body = ''
    let urlObject = populateUrlObject(url, token, body)
    await httpRequest('get', urlObject)
    let result = httpResult;
    if (!result) return
    //console.log(JSON.stringify(result))
    if (result.code == 0) {
        console.log('评论列表查询')
        var data = result.data;
        //开始评论for
        for (let index = 0; index < data.length; index++) {
            var conectTemId = data[index].conectTemId;
            var pickType = data[index].pickType;

            var aa = {
                "bbsFileList": [],
                "commentContent": "欣赏雪铁龙，加油棒棒哒",
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
            await putComment(token, aa);

        }

    } else {
        console.log('登录失败：' + result.message)

    }
}

//评论消息
async function putComment(token, data) {

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
        console.log('评论消息成功！！！')
    } else {
        console.log('评论消息失败：' + result.message)

    }
}

//查询最近更新的帖子
async function queryChoicenessNewList(token, topicId) {
    //1102626767558049804
    let url = `https://gateway-sapp.dpca.com.cn/api-c/v1/community/infoFlow/queryChoicenessNewList`
    let body = {"pageNum": "1", "pageSize": "10"};
    let urlObject = populateUrlObject(url, token, body)
    await httpRequest('post', urlObject)
    let result = httpResult;
    if (!result) return
    //console.log(JSON.stringify(result))
    if (result.code == 0) {
        console.log('最近帖子 查询需要评论的帖子成功！！！')
        var data = result.data.list;
        for (let index = 0; index < data.length; index++) {
            var conectTemId = data[index].id;
            var pickType = data[index].chonicenessType;

            var aa = {
                "bbsFileList": [],
                "commentContent": "欣赏雪铁龙，加油棒棒哒",
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
            await putComment(token, aa);
            await $.wait(500);
        }

    } else {
        console.log('通过主题id 查询需要评论的帖子失败：' + result.message)

    }
}

async function pushtizi(token, userid) {
    var aa = "{\"id\":\"1113054243778461773\",\"chonicenessType\":\"6\",\"showDateString\":null,\"postsType\":0,\"title\":\"这14个汽车故障灯亮起，你一定要重视（3）\",\"contentShort\":\"对于很多新手车主朋友来说，对车上常见的一些仪表指示灯还不是很熟悉，或者是只见过，却不知道有什么作用，它为什么会亮灯？亮灯了又该如何应对处理呢？\\n3、胎压指示灯作用：监测汽车轮胎胎压状况\\n亮灯原因：轮胎...\",\"content\":\"<p>对于很多新手车主朋友来说，对车上常见的一些仪表指示灯还不是很熟悉，或者是只见过，却不知道有什么作用，它为什么会亮灯？亮灯了又该如何应对处理呢？\\n3、胎压指示灯作用：监测汽车轮胎胎压状况\\n亮灯原因：轮胎压力不足或者压力过高\\n如何应对：应立即停车检查车胎的情况，通常有以下几种情况会出现胎压指示灯亮：轮胎被扎漏气、胎压过高、低胎压行车时间过长，如果胎压高，可以自己放一些气，如果胎压低，应该立即更换备胎或去4S店、维修厂调整胎压。</p>\",\"publisher\":\"娟子\",\"publisherPhone\":\"13545868855\",\"publishTime\":\"2022-07-24 12:36:49\",\"publishAdress\":null,\"readCount\":0,\"likeCount\":0,\"commentCount\":0,\"forwardCount\":0,\"shareCount\":0,\"isSensitivityPost\":0,\"isEssencePost\":0,\"isRecommendPost\":0,\"isHotPost\":0,\"sourceApp\":\"DC\",\"sourceType\":\"IOS\",\"createBy\":\"1083380194470035815\",\"createTime\":\"2022-07-24 12:36:49\",\"isLiked\":0,\"status\":1,\"machineStauts\":1,\"publishStatus\":1,\"coverImg\":null,\"coordinate\":{\"id\":\"1113054243778461777\",\"postId\":\"1113054243778461773\",\"longitude\":null,\"latitude\":null,\"address\":\"\"},\"mactalkName\":null,\"atUserList\":[],\"campus\":null,\"videoId\":null,\"videoStatus\":null,\"paragraphs\":[{\"id\":\"1113054243778461774\",\"parentId\":\"1113054243778461773\",\"parentType\":0,\"paragraphType\":0,\"paragraphContent\":\"这14个汽车故障灯亮起，你一定要重视（3）\",\"sourceApp\":\"DC\",\"sourceType\":\"IOS\",\"sourceVersion\":\"1.8\",\"sortNum\":1,\"fileId\":null,\"bbsFile\":null},{\"id\":\"1113054243778461775\",\"parentId\":\"1113054243778461773\",\"parentType\":0,\"paragraphType\":1,\"paragraphContent\":null,\"sourceApp\":\"DC\",\"sourceType\":\"IOS\",\"sourceVersion\":\"1.8\",\"sortNum\":1,\"fileId\":\"1113054243778461776\",\"bbsFile\":{\"id\":\"1113054243778461776\",\"fileTemType\":\"0\",\"fileTemId\":\"1113054243778461773\",\"fileAddress\":\"https://h5-sapp.dpca.com.cn/Loong-Citroen/images/iOS/2022-07-24243d5f2c151c9a05151c9a05243d5f2c.jpg\",\"fileAddressSmall\":\"https://h5-sapp.dpca.com.cn/Loong-Citroen/images/iOS/2022-07-24243d5f2c151c9a05151c9a05243d5f2c.jpg\",\"fileType\":\"0\",\"publisher\":\"娟子\",\"publisherPhone\":\"13545868855\",\"publishTime\":\"2022-07-24 12:36:49\",\"createBy\":\"1083380194470035815\",\"createDate\":\"2022-07-24 12:36:49\",\"updateBy\":\"1083380194470035815\",\"updateTime\":\"2022-07-24 12:36:49\",\"isEnable\":\"1\",\"sourceApp\":\"DC\",\"sourceType\":\"IOS\",\"videoTime\":null,\"videoSize\":null}}],\"carId\":null,\"carName\":null,\"userDetailVo\":{\"id\":\"1083380194470035816\",\"userId\":\"1083380194470035815\",\"uid\":null,\"nickName\":\"娟子\",\"totalScore\":4410,\"usableScore\":4410,\"growth\":9060,\"growthName\":\"白银会员\",\"gradeRuleSort\":\"2\",\"growthIcon\":\"\",\"count\":24,\"continuousCount\":24,\"isEnable\":1,\"isCarAttest\":0,\"isRecommend\":0,\"isPlus\":0,\"postsMute\":0,\"postsMuteDate\":null,\"commonetMute\":0,\"commentMuteDate\":null,\"isMute\":0,\"sourceApp\":\"DC\",\"followCount\":0,\"fansCount\":1,\"releaseCount\":27,\"essenceCount\":0,\"commentCount\":0,\"likeCount\":0,\"favoritesCount\":0,\"userName\":null,\"realName\":null,\"phone\":\"135****8855\",\"sex\":null,\"birthday\":null,\"avatar\":\"https://thirdwx.qlogo.cn/mmopen/vi_32/Q0j4TwGTfTJpC3FhW8n3haxonxeqVicPU4fZ2fCTNiaic8bynEqsEuo6icL694VPSVclhyJ3KibM578D2HKiceiaVh7cA/132\",\"email\":null,\"isInvite\":0,\"registerTime\":\"2022-07-01 15:00:35\",\"personalProfile\":null,\"userDescription\":null,\"isMutual\":0,\"isFans\":0,\"isFollow\":1,\"isBlack\":0,\"userIdentificationVoList\":null,\"userIdentificationName\":null,\"defaultCarName\":null,\"defaultAddress\":null,\"classify\":null,\"classifyNames\":null,\"xingeToken\":null,\"sourceType\":\"IOS\",\"deviceId\":null,\"isSigned\":0,\"beanId\":null,\"isPublishUser\":null,\"cars\":null,\"sourceAppVer\":null,\"navinfoId\":null,\"badges\":null,\"receiveBadges\":null,\"receiveBadgeNum\":null,\"nameListType\":0,\"badgeUrl\":null,\"nameListTime\":null,\"sourceRegister\":null},\"topicVOList\":[],\"fileVOList\":[{\"id\":\"1113054243778461776\",\"fileTemType\":\"0\",\"fileTemId\":\"1113054243778461773\",\"fileType\":\"0\",\"fileAddress\":\"https://h5-sapp.dpca.com.cn/Loong-Citroen/images/iOS/2022-07-24243d5f2c151c9a05151c9a05243d5f2c.jpg\",\"fileAddressSmall\":\"https://h5-sapp.dpca.com.cn/Loong-Citroen/images/iOS/2022-07-24243d5f2c151c9a05151c9a05243d5f2c.jpg\",\"publisher\":\"娟子\",\"publisherPhone\":\"13545868855\",\"publishTime\":\"2022-07-24 12:36:49\",\"createBy\":\"1083380194470035815\",\"createDate\":\"2022-07-24 12:36:49\",\"updateBy\":\"1083380194470035815\",\"updateTime\":\"2022-07-24 12:36:49\",\"isEnable\":\"1\",\"sourceApp\":\"DC\",\"sourceType\":\"IOS\",\"videoTime\":null,\"videoSize\":null}],\"sourceVersion\":null,\"hotFlag\":null,\"bizType\":null,\"bizId\":null,\"auditBy\":\"959\",\"auditName\":null,\"auditTime\":null,\"auditMassage\":null,\"commentVO\":null}";
    var oldDate = JSON.parse(aa);
    var paragraphs = oldDate.paragraphs;
    var paragraph1 = '';
    var paragraph0 = '';
    for (var i = 0; i < paragraphs.length; i++) {
        if (paragraphs[i].paragraphType == '1') {
            paragraph1 = paragraphs[i];
        } else if (paragraphs[i].paragraphType == '0') {
            paragraph0 = paragraphs[i];
        }
    }
    var reqData = {
        content: oldDate.content,
        postsType: oldDate.postsType,
        pickType: 1, //默认先传1
        paragraphs: {
            paragraphContent: oldDate.title, //需要去掉 p标签 先用title
            paragraphType: 0,
        },
        //挂在哪个主题
        topicVOList: [
            {
                "contentCount": 4817,
                "fileVOList": [
                    {
                        "createBy": "17",
                        "createDate": "2022-07-13 03:25:01",
                        "fileAddress": "https://h5-sapp.dpca.com.cn/46ac56e37a0944cdb01051028b2b9673.jpg",
                        "fileAddressSmall": "https://h5-sapp.dpca.com.cn/46ac56e37a0944cdb01051028b2b9673.jpg?imageView2/1/q/85",
                        "fileTemId": "1089045376593117191",
                        "fileTemType": "2",
                        "fileType": "0",
                        "id": "1101547940492624005",
                        "isEnable": "1",
                        "publishTime": "2022-07-13 03:25:01",
                        "publisher": "孙焕辰",
                        "sourceApp": "DC",
                        "sourceType": "SYSTEM",
                        "updateTime": "2022-07-13 03:25:01"
                    }
                ],
                "id": "1089045376593117191",
                "selectedType": 2,
                "title": "生活有你 爱有天逸"
            }
        ],
        atUserList: [],
        bbsFile: [
            {
                compressPath: paragraph1.bbsFile.fileAddress,//先用这个号地址
                createBy: userid,  //自己的id
                fileAddress: paragraph1.bbsFile.fileAddress,
                fileAddressSmall: paragraph1.bbsFile.fileAddressSmall,
                fileTemType: paragraph1.bbsFile.fileTemType,
                fileType: paragraph1.bbsFile.fileType,
                isSelectPic: false,
                localPath: '"/storage/emulated/0/Pictures/WeiXin/mmexport1658634024185.jpg"',

            }
        ],
        userId: userid,//自己填!!!
        sourceApp: oldDate.sourceApp,
        sourceType: 'ANDROID',
        "coordinateDto": {
            "address": "",
            "latitude": "",
            "longitude": ""
        },
        title: oldDate.title,

    };
    await publishPostsNew(token, reqData)
}

//发表帖子---
async function publishPostsNew(token, data1,userid) {
    var aa2 = ' {"content":"","postsType":0,"pickType":1,"paragraphs":[{"paragraphContent":"","paragraphType":0}],"topicVOList":[{"contentCount":4817,"fileVOList":[{"createBy":"17","createDate":"2022-07-13 03:25:01","fileAddress":"https://h5-sapp.dpca.com.cn/46ac56e37a0944cdb01051028b2b9673.jpg","fileAddressSmall":"https://h5-sapp.dpca.com.cn/46ac56e37a0944cdb01051028b2b9673.jpg?imageView2/1/q/85","fileTemId":"1089045376593117191","fileTemType":"2","fileType":"0","id":"1101547940492624005","isEnable":"1","publishTime":"2022-07-13 03:25:01","publisher":"孙焕辰","sourceApp":"DC","sourceType":"SYSTEM","updateTime":"2022-07-13 03:25:01"}],"id":"1089045376593117191","selectedType":2,"title":"生活有你 爱有天逸"}],"atUserList":[],"bbsFile":[{"compressPath":"https://h5-sapp.dpca.com.cn/Loong-Citroen/images/Android/vctacywba1658634321334.jpg","createBy":"1110135246564106277","fileAddress":"https://h5-sapp.dpca.com.cn/Loong-Citroen/images/Android/vctacywba1658634321334.jpg","fileAddressSmall":"https://h5-sapp.dpca.com.cn/Loong-Citroen/images/Android/vctacywba1658634321334.jpg","fileTemType":6,"fileType":0,"isSelectPic":false,"localPath":"/storage/emulated/0/Pictures/WeiXin/mmexport1658634024185.jpg"}],"userId":"1110135246564106277","sourceApp":"DC","sourceType":"ANDROID","coordinateDto":{"address":"","latitude":"","longitude":""},"title":""}';
    var data = JSON.parse(aa2);
    data.content = data1.content;
    var str2 = data1.content.replace("<p>","").replace("</p>","");
    data.paragraphs.paragraphContent = str2;//去掉p 标签
    data.title = data1.title;
    data.userId = userid;
    data.bbsFile[0].createBy = userid;
    data.bbsFile[0].compressPath=data1.imageUrl;//图片影像
    data.bbsFile[0].fileAddress=data1.imageUrl;//图片影像
    data.bbsFile[0].fileAddressSmall=data1.imageUrl;//图片影像

    //图片随机 TOdo
    let url = `https://gateway-sapp.dpca.com.cn/api-c/v1/community/posts/publishPostsNew`
    let body = data;
    let urlObject = populateUrlObject(url, token, body)
    await httpRequest('post', urlObject)
    let result = httpResult;
    if (!result) return
    //console.log(JSON.stringify(result))
    if (result.code == 0) {
        console.log('发表帖子成功！！！,主题为'+data1.title)
    } else {
        console.log('发表帖子失败：' + result.message)

    }
}

//查询某个用户发帖数
async function queryChoicenessByUserDTO(token, userid,otherid) {
    let url = `https://gateway-sapp.dpca.com.cn/api-c/v1/community/infoFlow/queryChoicenessByUserDTO`
    let body = {"pageNum": "1", "pageSize": "100", "userId": otherid};
    let urlObject = populateUrlObject(url, token, body)
    await httpRequest('post', urlObject)
    let result = httpResult;
    if (!result) return
    //console.log(JSON.stringify(result))
    if (result.code == 0) {
        console.log('查询某个用户发帖数成功！！！')
        var total = result.data.total;
        //组织随机图片数据------------------------
        if(imageArr.length==0){
            for (var i = 0; i < total; i++) {
                var imagelist=result.data.list[i].fileVOList;
                if(imagelist.length>0){
                    for (var j = 0; j < imagelist.length; j++) {
                        imageArr.push(imagelist[j].fileAddress);
                    }
                }
            }
        }
        var aNumber = (total) * Math.random();
        var aNumber1 = Math.floor(aNumber);
        //获取随机数据 该用户的某个帖子
        var infoData = result.data.list[aNumber1];
        var imageNo = Math.floor((imageArr.length) * Math.random());//随机图片数据
        infoData.imageUrl=imageArr[imageNo];//随机图片url
        await publishPostsNew(token, infoData,userid)
        await $.wait(1000);

    } else {
        console.log('发表帖子失败：' + result.message)

    }
}


///////////////////////////////////////////////////////////////////

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

    if (dfxtlpassword) {
        if (dfxtlpassword.indexOf("@") != -1) {
            dfxtlpassword.split("@").forEach((item) => {
                dfxtlpasswordArr.push(item);
            });
        } else if (dfxtlpassword.indexOf("\n") != -1) {
            dfxtlpassword.split("\n").forEach((item) => {
                dfxtlpasswordArr.push(item);
            });
        } else {
            dfxtlpasswordArr.push(dfxtlpassword);
        }
    } else {
        log(`\n 【${$.name}】：未填写变量 dfxtlpassword`)
        return;
    }

    if (dfxtlpasswordArr.length >= 1 && dfxtlphoneArr.length != dfxtlpasswordArr.length) {
        log(`提示：请将提现变量与普通变量一一对应，否则会出现问题`)
    }

    return true;
}

async function GetRewrite() {
    if ($request.url.indexOf('getIndexSignInInfo') > -1) {
        let ppu = $request.headers.ppu ? $request.headers.ppu : $request.headers.PPU
        if (!ppu) return;
        let uid = ppu.match(/UID=(\w+)/)[1]
        let ck = 'PPU=' + ppu

        if (userCookie) {
            if (userCookie.indexOf('UID=' + uid) == -1) {
                userCookie = userCookie + '@' + ck
                $.setdata(userCookie, ckkey);
                ckList = userCookie.split('@')
                $.msg(jsname + ` 获取第${ckList.length}个${ckkey}成功: ${ck}`)
            } else {
                console.log(jsname + ` 找到重复的${ckkey}，准备替换: ${ck}`)
                ckList = userCookie.split('@')
                for (let i = 0; i < ckList.length; i++) {
                    if (ckList[i].indexOf('UID=' + uid) > -1) {
                        ckList[i] = ck
                        break;
                    }
                }
                userCookie = ckList.join('@')
                $.setdata(userCookie, ckkey);
            }
        } else {
            $.setdata(ck, ckkey);
            $.msg(jsname + ` 获取第1个${ckkey}成功: ${ck}`)
        }
    }
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