const libre = require('libreoffice-convert');
const path = require('path');
const fs = require('fs');
const fs2 = require('fs').promises;
const { promisify } = require('bluebird');
let lib_convert = promisify(libre.convert)
const cron = require('node-cron');
const express = require('express');
const http = require('http');
const https = require('https');
const axios = require('axios');
const agent = new https.Agent({ rejectUnauthorized: false });

const app = express();
const server = http.createServer(app);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


const configs = {
    port: 3202, // custom port to access server
    api_key : 'NAND.CLOUD',
    base_url : 'http://127.0.0.1/',
};

let date_ob = new Date();
let date = ("0" + date_ob.getDate()).slice(-2);


cron.schedule('* * * * * *', function() {
    date_ob = new Date();
    date = ("0" + date_ob.getDate()).slice(-2);
    deleteFile()
});

function deleteFile(){
    const dir = path.join(__dirname, `/public`)
    const files = fs.readdirSync(dir)

    for (const file of files) {
        if (!file.includes(date)) {
            fs.unlink(dir+"/"+file, function(err) {
                if(err && err.code == 'ENOENT') {
                    // file doens't exist
                    console.info("File doesn't exist, won't remove it.");
                } else if (err) {
                    // other errors, e.g. maybe we don't have enough permission
                    console.error("Error occurred while trying to remove file");
                } else {
                    console.info(`removed`);
                }
            });
        }
    }
}

function between(min, max) {  
    return Math.floor(
        Math.random() * (max - min + 1) + min
    )
}

async function convert(name,res,random) {
  try {
    let arr = name.split('.')
    const enterPath = path.join(__dirname, `/public/${name}`);
    const outputPath = path.join(__dirname, `/public/${arr[0]}.pdf`);
    // Read file
    let data = await fs2.readFile(enterPath)
    let done = await lib_convert(data, '.pdf', undefined)
    await fs2.writeFile(outputPath, done)
    // return { success: true, fileName: arr[0] };
    res.end(JSON.stringify({
        status: true,
        message: 'Success, please download before file deleted',
        url: configs.base_url+"download/"+arr[0]
    }));
  } catch (err) {
    console.log(err)
    return { success: false }
  }
}

app.get('/',function(req,res) {
    res.sendFile('index.html', { root: __dirname,base_url:configs.base_url })
});

app.get('/download/:name',function(req,res) {
    const name = req.params.name
    const files = `${__dirname}/public/${name}.pdf`;
    res.download(files)
});

app.post('/convert', async (req, res) => {
    const api_key = req.body.api_key;
    const url = req.body.url;
    const random = between(111111,999999);

    if (api_key == null || url == null) {
        res.end(JSON.stringify({
            status: false,
            message: 'api_key / url is null'
        }));
    } else if (api_key != configs.api_key){
        res.end(JSON.stringify({
            status: false,
            message: 'invalid api_key'
        }));
    }else{

        // download data dulu
        axios({
            method: "get",
            url: url,
            httpsAgent : agent,
            responseType: "stream"
        }).then(function (response) {
            // console.log(response)
            response.data.pipe(fs.createWriteStream(path.join(__dirname, `/public/nand_convert_${random}_${date}.docx`)));

            new Promise((resolve, reject) => {
            response.data.on('end', () => {
                let result = convert(`nand_convert_${random}_${date}.docx`,res,random);
                // if (result.status) {
                    
                // }else{
                //     res.end(JSON.stringify({
                //         status: 1,
                //         message: 'Failed, Please Try Again'
                //     }));
                // }
            })
        
            response.data.on('error', () => {
                res.end(JSON.stringify({
                    status: 1,
                    message: 'Failed, Please Try Again'
                }));
            })
            })
            // let result = convert(`nand_convert_16_aa.docx`);

            
        })  
            .catch(error => {  
            console.log(error);  
        });

        
        

    }
}); 

// convert(`nand_convert_16.docx`)

server.listen(configs.port, function () {
    console.log('App running on *: ' + configs.port);
});
