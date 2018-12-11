'use strict';

const chai = require('chai');
const chaiHttp = require('chai-http');
const faker = require('faker');
const mongoose = require('mongoose');

const expect = chai.expect;

const {Post, Author} = require('../models');
const {app, runServer, closeServer} = require('../server');
const {TEST_DATABASE_URL} = require('../config');

chai.use(chaiHttp);

function seedPostData() {
	console.info('seeding blog post data');
	const seedData = [];

	for(let i = 0; i<10; i++){
		seedData.push(generatePostData());
	};
	return Post.insertMany(seedData);
};

function generatePostTitle() {
	const titles = ['Here and Now', 'Testing Data', 'Oh No, Hippos!', 'Title Four', 'Coding for Animals'];
	return titles[Math.floor(Math.random() * titles.length)];
};

function generatePostData() {
	return {
		author: {
			firstName: faker.name.firstName(),
		 	lastName: faker.name.lastName()
		 },
		title: generatePostTitle(),
		content: faker.lorem.paragraph(),
		created: faker.date.recent()
	};
};

function tearDownDb() {
	console.warn('Tearing down database');
	return mongoose.connection.dropDatabase();
};

describe('Blog API Resource', function() {
	
	before(function(){
		return runServer(TEST_DATABASE_URL);
	});

	beforeEach(function(){
		return seedPostData();
	});

	afterEach(function(){
		return tearDownDb();
	});

	after(function(){
		return closeServer();
	});

	//test GET endpoint
	describe('GET endpoint', function(){

		it('should return all existing blog posts', function(){
			let res;
			return chai.request(app)
				.get('/posts')
				.then(function(_res) {
					res = _res;
					expect(res).to.have.status(200);
					expect(res).to.be.json;
					expect(res.body.blogposts).to.have.lengthOf.at.least(1);
					return Post.count();
				})
				.then(function(count){
					expect(res.body.blogposts).to.have.lengthOf(count);
				});
		});

		it('should return posts with correct fields', function(){
			let resPost;
			return chat.request(app)
				.get('/posts')
				.then(function(res) {
					expect(res).to.have.status(200);
					expect(res).to.be.json;
					expect(res.body.blogposts).to.be.a('array');

					res.body.blogposts.forEach(function(blogpost){
						expect(blogpost).to.be.a('object');
						expect(blogpost).to.include.keys('id', 'author', 'title', 'content', 'created');
					});
					resPost = res.body.blogposts[0];
					return Post.findById(resPost.id);
				})
				.then(function(blogpost){
					expect(resPost.id).to.equal(blogpost.id);
					expect(resPost.author).to.equal(blogpost.author);
					expect(resPost.content).to.equal(blogpost.content);
					expect(resPost.title).to.equal(blogpost.title);
					expect(resPost.created).to.equal(blogpost.created);
				});
		});
	});
	//test POST endpoint
	describe('POST endpoint', function(){

	});
});