function getCookieVal(cName) {
    var cVal = null;
    document.cookie.split(';').forEach(function (h) {
        if(h.indexOf('=') > 0) {
            var cookieName = h.split('=')[0];
            var cookieVal = h.split('=')[1];
            if (cookieName.replace(/ /g, '') == cName) {
                cVal = cookieVal;
                return cookieVal;
            }
        }
    });
    return cVal;
}

var app = angular.module('discussionapp', ['ngRoute']);
app.controller('nkController', function ($scope, nkService, $rootScope, $location) {
    var loggedInUserID = getCookieVal('user-Id');

    $rootScope.safeApply = function (fn) {
        var phase = this.$root.$$phase;
        if (phase == '$apply' || phase == '$digest') {
            if (fn && (typeof(fn) === 'function')) {
                fn();
            }
        } else {
            this.$apply(fn);
        }
    };

    console.log("logged in app ", loggedInUserID);
    if(!loggedInUserID){
        $rootScope.safeApply(function () {
            $location.path('/login');
        });
    }

    $scope.mainheading = "Ask Questions";
    $scope.heading = "View all questions";

    $scope.deleteDiscussion = function (dqnitem) {
        _.remove($scope.Qns, {"Id": dqnitem.Id});
        var removeobj = {
            Id: dqnitem.Id
        };
        nkService.deleteDiscussion(removeobj);

    };
    var x = nkService.getDiscussions();
    var success = function (resp) {
        $scope.Qns = resp.data.Body.list.filter(function (filterItem) {
            return filterItem.ParentId ? false : true;
        });
        $scope.Qns.map(function (qn) {
            qn.answersCount = _.filter(resp.data.Body.list, {"ParentId": qn.Id}).length;
            qn.likesCount = qn.Likes ? qn.Likes.length : 0;
        });


    };
    var error = function () {
    };
    x.then(success, error);

    $scope.addDiscussions = function (dcontent) {
        var discobj = {
            Content: dcontent
        };
        nkService.addDiscussion(discobj).then(function () {
            nkService.getDiscussions().then(success);
        })
    };
});

app.controller('qnDetailController', function ($scope, $routeParams, nkService) {
    var x = nkService.getDiscussions();

    var selectedqn = [];



    var loggedInUserID = getCookieVal('user-Id');

    var success = function (resp) {
        var qns = resp.data.Body.list;
        selectedqn = _.filter(qns, function (f) {
            return f.Id == $routeParams.qnId;
        });

        $scope.IsLiked = false;
        if (selectedqn[0]) {
            $scope.questionContent = selectedqn[0].Content;
            selectedqn[0].Views = selectedqn[0].Views ? parseInt(selectedqn[0].Views) + 1 : 1;
            if (loggedInUserID) {
                var Likes = selectedqn[0].Likes ? selectedqn[0].Likes : [];
                var isLiked = _.filter(Likes, function (idItem) {
                    return idItem == loggedInUserID;
                });
                if (isLiked.length > 0) {
                    $scope.IsLiked = true;
                }
            }
            nkService.updateDiscussion(selectedqn[0]);
        }
        $scope.answers = _.filter(qns, function (f) {
            return f.ParentId == $routeParams.qnId;
        });
    };
    var error = function () {
    };
    x.then(success, error);
    $scope.addAnswer = function (dcomment) {
        var discobj = {
            Content: dcomment,
            ParentId: $routeParams.qnId
        };
        nkService.addDiscussion(discobj).then(function () {
            $scope.comment = "";
            nkService.getDiscussions().then(function (resp) {
                var qns = resp.data.Body.list;
                $scope.answers = _.filter(qns, function (f) {
                    return f.ParentId == $routeParams.qnId;
                });
            });

        });
    };

    $scope.likeThisQuestion = function (isLike) {
        if (selectedqn[0] && loggedInUserID) {
            if (isLike) {
                selectedqn[0].Likes = selectedqn[0].Likes ? selectedqn[0].Likes : [];
                selectedqn[0].Likes.push(loggedInUserID);
                $scope.IsLiked = true;
                nkService.updateDiscussion(selectedqn[0]);
            } else {
                selectedqn[0].Likes = selectedqn[0].Likes ? selectedqn[0].Likes : [];
                _.remove(selectedqn[0].Likes, function (h) {
                    return loggedInUserID == h;
                });
                $scope.IsLiked = false;
                nkService.updateDiscussion(selectedqn[0]);
            }
        } else {
            console.log("Please Login");
        }
    };
});

app.controller('loginController', function ($scope, nkService, $location, $rootScope) {

    console.log('login page dude!!!');
    $scope.IsLogin = true;

    $scope.User = {"Username": "", "Password": "", "CPassword": ""};

    $scope.showRegisterForm = function () {
        $scope.IsLogin = false;
    };

    $rootScope.safeApply = function (fn) {
        var phase = this.$root.$$phase;
        if (phase == '$apply' || phase == '$digest') {
            if (fn && (typeof(fn) === 'function')) {
                fn();
            }
        } else {
            this.$apply(fn);
        }
    };

    $scope.authenticateUser = function () {
        nkService.getUsers().then(function (resp) {
            var users = resp.data.Body.list;

            var loggedInUser = _.filter(users, {"Username": $scope.User.Username, "Password": $scope.User.Password});
            if (loggedInUser.length > 0) {
                document.cookie = "user-Id=" + loggedInUser[0].Id;
                $rootScope.safeApply(function () {
                    $location.path('/home');
                });

                //Emit 'user-changed' event on rootScope to notify header
                $rootScope.$emit('user-changed',true);
            }
        });
    };


    $scope.addUser = function () {
        nkService.addUser($scope.User).then(function () {
            $scope.IsLogin = true;
            $scope.User = {"Username": "", "Password": "", "CPassword": ""};


        });
    };
});
app.service('nkService', function ($http) {
    var makeRequest = function (url, method, data) {
        var promise = $http({url: url, method: method, data: data});
        return promise;
    };
    this.getDiscussions = function () {
        return makeRequest('http://localhost:5654/table/discussions', 'GET', {});

    };
    this.addDiscussion = function (discussionData) {
        return makeRequest('http://localhost:5654/table/discussions', 'POST', discussionData);
    };
    this.deleteDiscussion = function (discussionData) {
        return makeRequest('http://localhost:5654/table/discussions?Id=' + discussionData['Id'], 'DELETE', discussionData);
    };
    this.updateDiscussion = function (discussionData) {
        return makeRequest('http://localhost:5654/table/discussions', 'POST', discussionData);
    };


    this.addUser = function (userobj) {
        return makeRequest('http://localhost:5654/table/users', 'POST', userobj);
    };

    this.getUsers = function (userobj) {
        return makeRequest('http://localhost:5654/table/users', 'GET', {});
    };
});

app.directive('globalHeader', function ($location, $rootScope, nkService) {
    return {
        restrict: 'E',
        templateUrl:'header.html',
        controller: function ($scope) {

            //safe Apply avoids digest errors while trying to do changes to scope in the  middle of binding
            //this is rootScope level binding
            $rootScope.safeApply = function (fn) {
                var phase = this.$root.$$phase;
                if (phase == '$apply' || phase == '$digest') {
                    if (fn && (typeof(fn) === 'function')) {
                        fn();
                    }
                } else {
                    this.$apply(fn);
                }
            };

            //safe Apply avoids digest errors while trying to do changes to scope in the  middle of binding
            //this is directive level binding i.e., current directive scope
            $scope.safeApply = function (fn) {
                var phase = this.$root.$$phase;
                if (phase == '$apply' || phase == '$digest') {
                    if (fn && (typeof(fn) === 'function')) {
                        fn();
                    }
                } else {
                    this.$apply(fn);
                }
            };

            var checkUser = function (loggedInId) {
                return nkService.getUsers().then(function (resp) {
                    var users = resp.data.Body.list;
                    var loggedInUsers = users.filter(function (filterItem) {
                        return filterItem.Id == loggedInId;
                    });
                    if(loggedInUsers.length > 0){
                        return true
                    }else{
                       return false;
                    }
                });
            };

            //method used to check cookie and set 'Isauthenticated' flag to show/hide 'logout'
            var checkAuthentication = function () {
                var loggedInUserID = getCookieVal('user-Id');
                if(loggedInUserID){
                    checkUser(loggedInUserID).then(function (isAuthenticated) {
                        if(isAuthenticated){
                            $scope.safeApply(function () {
                                $scope.Isauthenticated = true;
                            });

                        }else{
                            $scope.Isauthenticated = false;
                            $rootScope.safeApply(function () {
                                $location.path('/login');
                            });
                        }
                    });
                }else{
                    $scope.Isauthenticated = false;
                    $rootScope.safeApply(function () {
                        $location.path('/login');
                    });
                }
            };


            $scope.logout = function () {
                //we are setting some dummy cookie as of now, but cookie should removed from server response
                //by binding expires date in cookie
                document.cookie = "user-Id=USERID";
                checkAuthentication();
            };

            //runs on page load
            checkAuthentication();

            //listen to 'user-changed' event on rootScope to show/hide logout on basis of user logged in
            $rootScope.$on('user-changed', function (evt, IsAuthenticated) {
                $scope.Isauthenticated = IsAuthenticated;
            })
        }
    }
});
