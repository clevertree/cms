const fs = require('fs');
const path = require('path');
const express = require('express');
const nodemailer = require('nodemailer');
const smtpTransport = require("nodemailer-smtp-transport");

const BASE_DIR = path.resolve(path.dirname(__dirname));

class MailServer {
    constructor() {
        this.router = null;
    }


    async listen() {

        this.mail = nodemailer.createTransport(smtpTransport(this.config.mail));
        this.mail.verify((error, success) => {
            if (error || !success)
                console.error(`Error connecting to ${this.config.mail.host}`, error, this.config.mail);
            else
                console.log(`Connected to ${this.config.mail.host}`);
        });
    }
}

exports.MailManager = new MailServer();
