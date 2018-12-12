'use strict';

const chai = require('chai');
const chaiHttp = require('chai-http');
const faker = require('faker');
const mongoose = require('mongoose');

const expect = chai.expect;

const {BlogPost, Author} = require('../models');
const {app, runServer, closeServer} = require('../server');
const {TEST_DATABASE_URL} = require('../config');

chai.use(chaiHttp);

function seedPostData() {
	console.info('seeding blog post data');
	const seedData = [];

	for(let i = 0; i<10; i++){
		seedData.push(generatePostData());
	};
	return BlogPost.insertMany(seedData);
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
					expect(res.body).to.have.lengthOf.at.least(1);
					return BlogPost.count();
				})
				.then(function(count){
					expect(res.body).to.have.lengthOf(count);
				});
		});

		it('should return posts with correct fields', function(){
			let resPost;
			return chai.request(app)
				.get('/posts')
				.then(function(res) {
					expect(res).to.have.status(200);
					expect(res).to.be.json;
					expect(res.body).to.be.a('array');

					res.body.forEach(function(blogpost){
						expect(blogpost).to.be.a('object');
						expect(blogpost).to.include.keys('id', 'author', 'title', 'content', 'created');
					});
					resPost = res.body[0];
					return BlogPost.findById(resPost.id);
				})
				.then(function(blogpost){
					expect(resPost.id).to.equal(blogpost.id);
					expect(resPost.author).to.equal(`${blogpost.author.firstName} ${blogpost.author.lastName}`);
					expect(resPost.content).to.equal(blogpost.content);
					expect(resPost.title).to.equal(blogpost.title);
					expect(new Date(resPost.created)).to.deep.equal(new Date(blogpost.created));
				});
		});
	});
	//test POST endpoint
	describe('POST endpoint', function(){

		it('should create a new post', function(){

			let newPost = generatePostData();

			return chai.request(app)
				.post('/posts')
				.send(newPost)
				.then(function(res) {
					expect(res).to.have.status(201);
					expect(res).to.be.json;
					expect(res.body).to.be.a('object');
					expect(res.body).to.include.keys('id', 'title', 'author', 'content', 'created');
					expect(res.body.title).to.equal(newPost.title);
					expect(res.body.content).to.equal(newPost.content);
					expect(res.body.id).to.not.be.null;
					newPost.id = res.body.id;
					return BlogPost.findById(res.body.id);
				})
				.then(function(blogpost) {
					console.log(newPost, blogpost);
					expect(blogpost.id).to.equal(newPost.id);
					expect(blogpost.author.firstName).to.equal(newPost.author.firstName);
					expect(blogpost.author.lastName).to.equal(newPost.author.lastName);
					expect(blogpost.content).to.equal(newPost.content);
					expect(blogpost.title).to.equal(newPost.title);
				});
		});
	});

	//test PUT endpoint
	describe('PUT endpoint', function() {

		it('should update requested fields', function(){

			let updateData = {
				title: 'New Title WOO!',
				content: 'Here is some content for ya, chumps'
			};

			return BlogPost
				.findOne()
				.then(function(blogpost){
					updateData.id = blogpost.id;

					return chai.request(app)
						.put(`/posts/${blogpost.id}`)
						.send(updateData);
				})
				.then(function(res) {
					expect(res).to.have.status(204);

					return BlogPost
						.findById(updateData.id);
				})
				.then(function(blogpost) {
					expect(blogpost.title).to.equal(updateData.title);
					expect(blogpost.content).to.equal(updateData.content);
				});
		});
	});

	//test DELETE endpoint
	describe('DELETE endpoint', function() {

		it('should remove a blog post', function() {
			let targetPost;

			return BlogPost
				.findOne()
				.then(function(resPost) {
					targetPost = resPost;
					console.log(targetPost);
					return chai.request(app).delete(`/posts/${targetPost.id}`);
				})
				.then(function(res) {
					expect(res).to.have.status(204);
					return BlogPost.findById(targetPost.id);
				})
				.then(function(finalRes) {
					expect(finalRes).to.be.null;
				});
		});
	});
});