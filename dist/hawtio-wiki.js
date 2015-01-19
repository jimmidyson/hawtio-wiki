

/// <reference path="../../includes.ts"/>
var ActiveMQ;
(function (ActiveMQ) {
    ActiveMQ.log = Logger.get("activemq");
    ActiveMQ.jmxDomain = 'org.apache.activemq';
    function getSelectionQueuesFolder(workspace) {
        function findQueuesFolder(node) {
            if (node) {
                if (node.title === "Queues" || node.title === "Queue") {
                    return node;
                }
                var parent = node.parent;
                if (parent) {
                    return findQueuesFolder(parent);
                }
            }
            return null;
        }
        var selection = workspace.selection;
        if (selection) {
            return findQueuesFolder(selection);
        }
        return null;
    }
    ActiveMQ.getSelectionQueuesFolder = getSelectionQueuesFolder;
    function getSelectionTopicsFolder(workspace) {
        function findTopicsFolder(node) {
            var answer = null;
            if (node) {
                if (node.title === "Topics" || node.title === "Topic") {
                    answer = node;
                }
                if (answer === null) {
                    angular.forEach(node.children, function (child) {
                        if (child.title === "Topics" || child.title === "Topic") {
                            answer = child;
                        }
                    });
                }
            }
            return answer;
        }
        var selection = workspace.selection;
        if (selection) {
            return findTopicsFolder(selection);
        }
        return null;
    }
    ActiveMQ.getSelectionTopicsFolder = getSelectionTopicsFolder;
    /**
     * Sets $scope.row to currently selected JMS message.
     * Used in:
     *  - activemq/js/browse.ts
     *  - camel/js/browseEndpoint.ts
     *
     * TODO: remove $scope argument and operate directly on other variables. but it's too much side effects here...
     *
     * @param message
     * @param key unique key inside message that distinguishes between values
     * @param $scope
     */
    function selectCurrentMessage(message, key, $scope) {
        // clicking on message's link would interfere with messages selected with checkboxes
        $scope.gridOptions.selectAll(false);
        var idx = Core.pathGet(message, ["rowIndex"]);
        var jmsMessageID = Core.pathGet(message, ["entity", key]);
        $scope.rowIndex = idx;
        var selected = $scope.gridOptions.selectedItems;
        selected.splice(0, selected.length);
        if (idx >= 0 && idx < $scope.messages.length) {
            $scope.row = $scope.messages.find(function (msg) { return msg[key] === jmsMessageID; });
            if ($scope.row) {
                selected.push($scope.row);
            }
        }
        else {
            $scope.row = null;
        }
    }
    ActiveMQ.selectCurrentMessage = selectCurrentMessage;
    /**
     * - Adds functions needed for message browsing with details
     * - Adds a watch to deselect all rows after closing the slideout with message details
     * TODO: export these functions too?
     *
     * @param $scope
     */
    function decorate($scope) {
        $scope.selectRowIndex = function (idx) {
            $scope.rowIndex = idx;
            var selected = $scope.gridOptions.selectedItems;
            selected.splice(0, selected.length);
            if (idx >= 0 && idx < $scope.messages.length) {
                $scope.row = $scope.messages[idx];
                if ($scope.row) {
                    selected.push($scope.row);
                }
            }
            else {
                $scope.row = null;
            }
        };
        $scope.$watch("showMessageDetails", function () {
            if (!$scope.showMessageDetails) {
                $scope.row = null;
                $scope.gridOptions.selectedItems.splice(0, $scope.gridOptions.selectedItems.length);
            }
        });
    }
    ActiveMQ.decorate = decorate;
})(ActiveMQ || (ActiveMQ = {}));

/// <reference path="../../includes.ts"/>
/// <reference path="activemqHelpers.ts"/>
/**
 * @module ActiveMQ
 * @main ActiveMQ
 */
var ActiveMQ;
(function (ActiveMQ) {
    ActiveMQ.pluginName = 'activemq';
    ActiveMQ._module = angular.module(ActiveMQ.pluginName, ['bootstrap', 'ngResource', 'ui.bootstrap.dialog', 'hawtioCore', 'camel', 'hawtio-ui']);
    ActiveMQ._module.config(["$routeProvider", function ($routeProvider) {
        $routeProvider.when('/activemq/browseQueue', { templateUrl: 'app/activemq/html/browseQueue.html' }).when('/activemq/diagram', { templateUrl: 'app/activemq/html/brokerDiagram.html', reloadOnSearch: false }).when('/activemq/createDestination', { templateUrl: 'app/activemq/html/createDestination.html' }).when('/activemq/createQueue', { templateUrl: 'app/activemq/html/createQueue.html' }).when('/activemq/createTopic', { templateUrl: 'app/activemq/html/createTopic.html' }).when('/activemq/deleteQueue', { templateUrl: 'app/activemq/html/deleteQueue.html' }).when('/activemq/deleteTopic', { templateUrl: 'app/activemq/html/deleteTopic.html' }).when('/activemq/sendMessage', { templateUrl: 'app/camel/html/sendMessage.html' }).when('/activemq/durableSubscribers', { templateUrl: 'app/activemq/html/durableSubscribers.html' }).when('/activemq/jobs', { templateUrl: 'app/activemq/html/jobs.html' });
    }]);
    ActiveMQ._module.run(["$location", "workspace", "viewRegistry", "helpRegistry", "preferencesRegistry", function ($location, workspace, viewRegistry, helpRegistry, preferencesRegistry) {
        viewRegistry['activemq'] = 'app/activemq/html/layoutActiveMQTree.html';
        helpRegistry.addUserDoc('activemq', 'app/activemq/doc/help.md', function () {
            return workspace.treeContainsDomainAndProperties("org.apache.activemq");
        });
        preferencesRegistry.addTab("ActiveMQ", "app/activemq/html/preferences.html", function () {
            return workspace.treeContainsDomainAndProperties("org.apache.activemq");
        });
        workspace.addTreePostProcessor(postProcessTree);
        // register default attribute views
        var attributes = workspace.attributeColumnDefs;
        attributes[ActiveMQ.jmxDomain + "/Broker/folder"] = [
            { field: 'BrokerName', displayName: 'Name', width: "**" },
            { field: 'TotalProducerCount', displayName: 'Producer #' },
            { field: 'TotalConsumerCount', displayName: 'Consumer #' },
            { field: 'StorePercentUsage', displayName: 'Store %' },
            { field: 'TempPercentUsage', displayName: 'Temp %' },
            { field: 'MemoryPercentUsage', displayName: 'Memory %' },
            { field: 'TotalEnqueueCount', displayName: 'Enqueue #' },
            { field: 'TotalDequeueCount', displayName: 'Dequeue #' }
        ];
        attributes[ActiveMQ.jmxDomain + "/Queue/folder"] = [
            { field: 'Name', displayName: 'Name', width: "***" },
            { field: 'QueueSize', displayName: 'Queue Size' },
            { field: 'ProducerCount', displayName: 'Producer #' },
            { field: 'ConsumerCount', displayName: 'Consumer #' },
            { field: 'EnqueueCount', displayName: 'Enqueue #' },
            { field: 'DequeueCount', displayName: 'Dequeue #' },
            { field: 'MemoryPercentUsage', displayName: 'Memory %' },
            { field: 'DispatchCount', displayName: 'Dispatch #', visible: false }
        ];
        attributes[ActiveMQ.jmxDomain + "/Topic/folder"] = [
            { field: 'Name', displayName: 'Name', width: "****" },
            { field: 'ProducerCount', displayName: 'Producer #' },
            { field: 'ConsumerCount', displayName: 'Consumer #' },
            { field: 'EnqueueCount', displayName: 'Enqueue #' },
            { field: 'DequeueCount', displayName: 'Dequeue #' },
            { field: 'MemoryPercentUsage', displayName: 'Memory %' },
            { field: 'DispatchCount', displayName: 'Dispatch #', visible: false }
        ];
        attributes[ActiveMQ.jmxDomain + "/Consumer/folder"] = [
            { field: 'ConnectionId', displayName: 'Name', width: "**" },
            { field: 'PrefetchSize', displayName: 'Prefetch Size' },
            { field: 'Priority', displayName: 'Priority' },
            { field: 'DispatchedQueueSize', displayName: 'Dispatched Queue #' },
            { field: 'SlowConsumer', displayName: 'Slow ?' },
            { field: 'Retroactive', displayName: 'Retroactive' },
            { field: 'Selector', displayName: 'Selector' }
        ];
        attributes[ActiveMQ.jmxDomain + "/networkConnectors/folder"] = [
            { field: 'Name', displayName: 'Name', width: "**" },
            { field: 'UserName', displayName: 'User Name' },
            { field: 'PrefetchSize', displayName: 'Prefetch Size' },
            { field: 'ConduitSubscriptions', displayName: 'Conduit Subscriptions?' },
            { field: 'Duplex', displayName: 'Duplex' },
            { field: 'DynamicOnly', displayName: 'Dynamic Only' }
        ];
        attributes[ActiveMQ.jmxDomain + "/PersistenceAdapter/folder"] = [
            { field: 'IndexDirectory', displayName: 'Index Directory', width: "**" },
            { field: 'LogDirectory', displayName: 'Log Directory', width: "**" }
        ];
        workspace.topLevelTabs.push({
            id: "activemq",
            content: "ActiveMQ",
            title: "Manage your ActiveMQ message brokers",
            isValid: function (workspace) { return workspace.treeContainsDomainAndProperties("org.apache.activemq"); },
            href: function () { return "#/jmx/attributes?tab=activemq"; },
            isActive: function () { return workspace.isTopTabActive("activemq"); }
        });
        // add sub level tabs
        workspace.subLevelTabs.push({
            content: '<i class="icon-envelope"></i> Browse',
            title: "Browse the messages on the queue",
            isValid: function (workspace) { return isQueue(workspace) && workspace.hasInvokeRights(workspace.selection, "browse()"); },
            href: function () { return "#/activemq/browseQueue"; }
        });
        workspace.subLevelTabs.push({
            content: '<i class="icon-pencil"></i> Send',
            title: "Send a message to this destination",
            isValid: function (workspace) { return (isQueue(workspace) || isTopic(workspace)) && workspace.hasInvokeRights(workspace.selection, "sendTextMessage(java.util.Map,java.lang.String,java.lang.String,java.lang.String)"); },
            href: function () { return "#/activemq/sendMessage"; }
        });
        workspace.subLevelTabs.push({
            content: '<i class="icon-picture"></i> Diagram',
            title: "View a diagram of the producers, destinations and consumers",
            isValid: function (workspace) { return workspace.isTopTabActive("activemq") || workspace.selectionHasDomain(ActiveMQ.jmxDomain); },
            href: function () { return "#/activemq/diagram"; }
        });
        workspace.subLevelTabs.push({
            content: '<i class="icon-plus"></i> Create',
            title: "Create a new destination",
            isValid: function (workspace) { return isBroker(workspace) && workspace.hasInvokeRights(getBroker(workspace), "addQueue", "addTopic"); },
            href: function () { return "#/activemq/createDestination"; }
        });
        workspace.subLevelTabs.push({
            content: '<i class="icon-plus"></i> Create',
            title: "Create a new queue",
            isValid: function (workspace) { return isQueuesFolder(workspace) && workspace.hasInvokeRights(getBroker(workspace), "addQueue"); },
            href: function () { return "#/activemq/createQueue"; }
        });
        workspace.subLevelTabs.push({
            content: '<i class="icon-plus"></i> Create',
            title: "Create a new topic",
            isValid: function (workspace) { return isTopicsFolder(workspace) && workspace.hasInvokeRights(getBroker(workspace), "addQueue"); },
            href: function () { return "#/activemq/createTopic"; }
        });
        workspace.subLevelTabs.push({
            content: '<i class="icon-remove"></i> Delete Topic',
            title: "Delete this topic",
            isValid: function (workspace) { return isTopic(workspace) && workspace.hasInvokeRights(getBroker(workspace), "removeTopic"); },
            href: function () { return "#/activemq/deleteTopic"; }
        });
        workspace.subLevelTabs.push({
            content: '<i class="icon-remove"></i> Delete',
            title: "Delete or purge this queue",
            isValid: function (workspace) { return isQueue(workspace) && workspace.hasInvokeRights(getBroker(workspace), "removeQueue"); },
            href: function () { return "#/activemq/deleteQueue"; }
        });
        workspace.subLevelTabs.push({
            content: '<i class="icon-list"></i> Durable Subscribers',
            title: "Manage durable subscribers",
            isValid: function (workspace) { return isBroker(workspace); },
            href: function () { return "#/activemq/durableSubscribers"; }
        });
        workspace.subLevelTabs.push({
            content: '<i class="icon-list"></i> Jobs',
            title: "Manage jobs",
            isValid: function (workspace) { return isJobScheduler(workspace); },
            href: function () { return "#/activemq/jobs"; }
        });
        function postProcessTree(tree) {
            var activemq = tree.get("org.apache.activemq");
            setConsumerType(activemq);
            // lets move queue and topic as first children within brokers
            if (activemq) {
                angular.forEach(activemq.children, function (broker) {
                    angular.forEach(broker.children, function (child) {
                        // lets move Topic/Queue to the front.
                        var grandChildren = child.children;
                        if (grandChildren) {
                            var names = ["Topic", "Queue"];
                            angular.forEach(names, function (name) {
                                var idx = grandChildren.findIndex(function (n) { return n.title === name; });
                                if (idx > 0) {
                                    var old = grandChildren[idx];
                                    grandChildren.splice(idx, 1);
                                    grandChildren.splice(0, 0, old);
                                }
                            });
                        }
                    });
                });
            }
        }
        function setConsumerType(node) {
            if (node) {
                var parent = node.parent;
                var entries = node.entries;
                if (parent && !parent.typeName && entries) {
                    var endpoint = entries["endpoint"];
                    if (endpoint === "Consumer" || endpoint === "Producer") {
                        //console.log("Setting the typeName on " + parent.title + " to " + endpoint);
                        parent.typeName = endpoint;
                    }
                    var connectorName = entries["connectorName"];
                    if (connectorName && !node.icon) {
                        // lets default a connector icon
                        node.icon = Core.url("/img/icons/activemq/connector.png");
                    }
                }
                angular.forEach(node.children, function (child) { return setConsumerType(child); });
            }
        }
    }]);
    hawtioPluginLoader.addModule(ActiveMQ.pluginName);
    function getBroker(workspace) {
        var answer = null;
        var selection = workspace.selection;
        if (selection) {
            answer = selection.findAncestor(function (current) {
                // log.debug("Checking current: ", current);
                var entries = current.entries;
                if (entries) {
                    return (('type' in entries && entries.type === 'Broker') && 'brokerName' in entries && !('destinationName' in entries) && !('destinationType' in entries));
                }
                else {
                    return false;
                }
            });
        }
        return answer;
    }
    ActiveMQ.getBroker = getBroker;
    function isQueue(workspace) {
        //return workspace.selectionHasDomainAndType(jmxDomain, 'Queue');
        return workspace.hasDomainAndProperties(ActiveMQ.jmxDomain, { 'destinationType': 'Queue' }, 4) || workspace.selectionHasDomainAndType(ActiveMQ.jmxDomain, 'Queue');
    }
    ActiveMQ.isQueue = isQueue;
    function isTopic(workspace) {
        //return workspace.selectionHasDomainAndType(jmxDomain, 'Topic');
        return workspace.hasDomainAndProperties(ActiveMQ.jmxDomain, { 'destinationType': 'Topic' }, 4) || workspace.selectionHasDomainAndType(ActiveMQ.jmxDomain, 'Topic');
    }
    ActiveMQ.isTopic = isTopic;
    function isQueuesFolder(workspace) {
        return workspace.selectionHasDomainAndLastFolderName(ActiveMQ.jmxDomain, 'Queue');
    }
    ActiveMQ.isQueuesFolder = isQueuesFolder;
    function isTopicsFolder(workspace) {
        return workspace.selectionHasDomainAndLastFolderName(ActiveMQ.jmxDomain, 'Topic');
    }
    ActiveMQ.isTopicsFolder = isTopicsFolder;
    function isJobScheduler(workspace) {
        return workspace.hasDomainAndProperties(ActiveMQ.jmxDomain, { 'service': 'JobScheduler' }, 4);
    }
    ActiveMQ.isJobScheduler = isJobScheduler;
    function isBroker(workspace) {
        if (workspace.selectionHasDomainAndType(ActiveMQ.jmxDomain, 'Broker')) {
            var self = Core.pathGet(workspace, ["selection"]);
            var parent = Core.pathGet(workspace, ["selection", "parent"]);
            return !(parent && (parent.ancestorHasType('Broker') || self.ancestorHasType('Broker')));
        }
        return false;
    }
    ActiveMQ.isBroker = isBroker;
})(ActiveMQ || (ActiveMQ = {}));

/**
 * @module Git
 */
var Git;
(function (Git) {
    function createGitRepository(workspace, jolokia, localStorage) {
        var mbean = getGitMBean(workspace);
        if (mbean && jolokia) {
            return new Git.JolokiaGit(mbean, jolokia, localStorage, workspace.userDetails);
        }
        // TODO use local storage to make a little wiki thingy?
        return null;
    }
    Git.createGitRepository = createGitRepository;
    Git.jmxDomain = "hawtio";
    Git.mbeanType = "GitFacade";
    function hasGit(workspace) {
        return getGitMBean(workspace) !== null;
    }
    Git.hasGit = hasGit;
    /**
     * Returns the JMX ObjectName of the git mbean
     * @method getGitMBean
     * @for Git
     * @param {Workspace} workspace
     * @return {String}
     */
    function getGitMBean(workspace) {
        return Core.getMBeanTypeObjectName(workspace, Git.jmxDomain, Git.mbeanType);
    }
    Git.getGitMBean = getGitMBean;
    /**
     * Returns the Folder for the git mbean if it can be found
     * @method getGitMBeanFolder
     * @for Git
     * @param {Workspace} workspace
     * @return {Folder}
     */
    function getGitMBeanFolder(workspace) {
        return Core.getMBeanTypeFolder(workspace, Git.jmxDomain, Git.mbeanType);
    }
    Git.getGitMBeanFolder = getGitMBeanFolder;
    /**
     * Returns true if the git mbean is a fabric configuration repository
     * (so we can use it for the fabric plugin)
     * @method isGitMBeanFabric
     * @for Git
     * @param {Workspace} workspace
     * @return {Boolean}
     */
    function isGitMBeanFabric(workspace) {
        var folder = getGitMBeanFolder(workspace);
        return folder && folder.entries["repo"] === "fabric";
    }
    Git.isGitMBeanFabric = isGitMBeanFabric;
})(Git || (Git = {}));

/// <reference path="../../includes.ts"/>
/// <reference path="../../git/ts/gitHelpers.ts"/>
/**
 * @module Wiki
 */
var Wiki;
(function (Wiki) {
    Wiki.log = Logger.get("Wiki");
    Wiki.camelNamespaces = ["http://camel.apache.org/schema/spring", "http://camel.apache.org/schema/blueprint"];
    Wiki.springNamespaces = ["http://www.springframework.org/schema/beans"];
    Wiki.droolsNamespaces = ["http://drools.org/schema/drools-spring"];
    Wiki.dozerNamespaces = ["http://dozer.sourceforge.net"];
    Wiki.activemqNamespaces = ["http://activemq.apache.org/schema/core"];
    Wiki.excludeAdjustmentPrefixes = ["http://", "https://", "#"];
    (function (ViewMode) {
        ViewMode[ViewMode["List"] = 0] = "List";
        ViewMode[ViewMode["Icon"] = 1] = "Icon";
    })(Wiki.ViewMode || (Wiki.ViewMode = {}));
    var ViewMode = Wiki.ViewMode;
    ;
    /**
     * The custom views within the wiki namespace; either "/wiki/$foo" or "/wiki/branch/$branch/$foo"
     */
    Wiki.customWikiViewPages = ["/formTable", "/camel/diagram", "/camel/canvas", "/camel/properties", "/dozer/mappings"];
    /**
     * Which extensions do we wish to hide in the wiki file listing
     * @property hideExtensions
     * @for Wiki
     * @type Array
     */
    Wiki.hideExtensions = [".profile"];
    var defaultFileNamePattern = /^[a-zA-Z0-9._-]*$/;
    var defaultFileNamePatternInvalid = "Name must be: letters, numbers, and . _ or - characters";
    var defaultFileNameExtensionPattern = "";
    var defaultLowerCaseFileNamePattern = /^[a-z0-9._-]*$/;
    var defaultLowerCaseFileNamePatternInvalid = "Name must be: lower-case letters, numbers, and . _ or - characters";
    /**
     * The wizard tree for creating new content in the wiki
     * @property documentTemplates
     * @for Wiki
     * @type Array
     */
    Wiki.documentTemplates = [
        {
            label: "Folder",
            tooltip: "Create a new folder to contain documents",
            folder: true,
            icon: "/img/icons/wiki/folder.gif",
            exemplar: "myfolder",
            regex: defaultLowerCaseFileNamePattern,
            invalid: defaultLowerCaseFileNamePatternInvalid
        },
        {
            label: "App",
            tooltip: "Creates a new App folder used to configure and run containers",
            addClass: "icon-cog green",
            exemplar: 'myapp',
            regex: defaultFileNamePattern,
            invalid: defaultFileNamePatternInvalid,
            extension: '',
            generated: {
                mbean: ['io.fabric8', { type: 'KubernetesTemplateManager' }],
                init: function (workspace, $scope) {
                },
                generate: function (options) {
                    Wiki.log.debug("Got options: ", options);
                    options.form.name = options.name;
                    options.form.path = options.parentId;
                    options.form.branch = options.branch;
                    var json = angular.toJson(options.form);
                    var jolokia = HawtioCore.injector.get("jolokia");
                    jolokia.request({
                        type: 'exec',
                        mbean: 'io.fabric8:type=KubernetesTemplateManager',
                        operation: 'createAppByJson',
                        arguments: [json]
                    }, Core.onSuccess(function (response) {
                        Wiki.log.debug("Generated app, response: ", response);
                        options.success(undefined);
                    }, {
                        error: function (response) {
                            options.error(response.error);
                        }
                    }));
                },
                form: function (workspace, $scope) {
                    if (!$scope.doDockerRegistryCompletion) {
                        $scope.fetchDockerRepositories = function () {
                            return DockerRegistry.completeDockerRegistry();
                        };
                    }
                    return {
                        summaryMarkdown: 'Add app summary here',
                        replicaCount: 1
                    };
                },
                schema: {
                    description: 'App settings',
                    type: 'java.lang.String',
                    properties: {
                        'dockerImage': {
                            'description': 'Docker Image',
                            'type': 'java.lang.String',
                            'input-attributes': {
                                'required': '',
                                'class': 'input-xlarge',
                                'typeahead': 'repo for repo in fetchDockerRepositories() | filter:$viewValue',
                                'typeahead-wait-ms': '200'
                            }
                        },
                        'summaryMarkdown': {
                            'description': 'Short Description',
                            'type': 'java.lang.String',
                            'input-attributes': { 'class': 'input-xlarge' }
                        },
                        'replicaCount': {
                            'description': 'Replica Count',
                            'type': 'java.lang.Integer',
                            'input-attributes': {
                                min: '0'
                            }
                        },
                        'labels': {
                            'description': 'Labels',
                            'type': 'map',
                            'items': {
                                'type': 'string'
                            }
                        }
                    }
                }
            }
        },
        {
            label: "Fabric8 Profile",
            tooltip: "Create a new empty fabric profile. Using a hyphen ('-') will create a folder heirarchy, for example 'my-awesome-profile' will be available via the path 'my/awesome/profile'.",
            profile: true,
            addClass: "icon-book green",
            exemplar: "user-profile",
            regex: defaultLowerCaseFileNamePattern,
            invalid: defaultLowerCaseFileNamePatternInvalid,
            fabricOnly: true
        },
        {
            label: "Properties File",
            tooltip: "A properties file typically used to configure Java classes",
            exemplar: "properties-file.properties",
            regex: defaultFileNamePattern,
            invalid: defaultFileNamePatternInvalid,
            extension: ".properties"
        },
        {
            label: "JSON File",
            tooltip: "A file containing JSON data",
            exemplar: "document.json",
            regex: defaultFileNamePattern,
            invalid: defaultFileNamePatternInvalid,
            extension: ".json"
        },
        {
            label: "Key Store File",
            tooltip: "Creates a keystore (database) of cryptographic keys, X.509 certificate chains, and trusted certificates.",
            exemplar: 'keystore.jks',
            regex: defaultFileNamePattern,
            invalid: defaultFileNamePatternInvalid,
            extension: ".jks",
            generated: {
                mbean: ['hawtio', { type: 'KeystoreService' }],
                init: function (workspace, $scope) {
                    var mbean = 'hawtio:type=KeystoreService';
                    var response = workspace.jolokia.request({ type: "read", mbean: mbean, attribute: "SecurityProviderInfo" }, {
                        success: function (response) {
                            $scope.securityProviderInfo = response.value;
                            Core.$apply($scope);
                        },
                        error: function (response) {
                            console.log('Could not find the supported security algorithms: ', response.error);
                            Core.$apply($scope);
                        }
                    });
                },
                generate: function (options) {
                    var encodedForm = JSON.stringify(options.form);
                    var mbean = 'hawtio:type=KeystoreService';
                    var response = options.workspace.jolokia.request({
                        type: 'exec',
                        mbean: mbean,
                        operation: 'createKeyStoreViaJSON(java.lang.String)',
                        arguments: [encodedForm]
                    }, {
                        method: 'POST',
                        success: function (response) {
                            options.success(response.value);
                        },
                        error: function (response) {
                            options.error(response.error);
                        }
                    });
                },
                form: function (workspace, $scope) {
                    return {
                        storeType: $scope.securityProviderInfo.supportedKeyStoreTypes[0],
                        createPrivateKey: false,
                        keyLength: 4096,
                        keyAlgorithm: $scope.securityProviderInfo.supportedKeyAlgorithms[0],
                        keyValidity: 365
                    };
                },
                schema: {
                    "description": "Keystore Settings",
                    "type": "java.lang.String",
                    "properties": {
                        "storePassword": {
                            "description": "Keystore password.",
                            "type": "password",
                            'input-attributes': { "required": "", "ng-minlength": 6 }
                        },
                        "storeType": {
                            "description": "The type of store to create",
                            "type": "java.lang.String",
                            'input-element': "select",
                            'input-attributes': { "ng-options": "v for v in securityProviderInfo.supportedKeyStoreTypes" }
                        },
                        "createPrivateKey": {
                            "description": "Should we generate a self-signed private key?",
                            "type": "boolean"
                        },
                        "keyCommonName": {
                            "description": "The common name of the key, typically set to the hostname of the server",
                            "type": "java.lang.String",
                            'control-group-attributes': { 'ng-show': "formData.createPrivateKey" }
                        },
                        "keyLength": {
                            "description": "The length of the cryptographic key",
                            "type": "Long",
                            'control-group-attributes': { 'ng-show': "formData.createPrivateKey" }
                        },
                        "keyAlgorithm": {
                            "description": "The key algorithm",
                            "type": "java.lang.String",
                            'input-element': "select",
                            'input-attributes': { "ng-options": "v for v in securityProviderInfo.supportedKeyAlgorithms" },
                            'control-group-attributes': { 'ng-show': "formData.createPrivateKey" }
                        },
                        "keyValidity": {
                            "description": "The number of days the key will be valid for",
                            "type": "Long",
                            'control-group-attributes': { 'ng-show': "formData.createPrivateKey" }
                        },
                        "keyPassword": {
                            "description": "Password to the private key",
                            "type": "password",
                            'control-group-attributes': { 'ng-show': "formData.createPrivateKey" }
                        }
                    }
                }
            }
        },
        {
            label: "Markdown Document",
            tooltip: "A basic markup document using the Markdown wiki markup, particularly useful for ReadMe files in directories",
            exemplar: "ReadMe.md",
            regex: defaultFileNamePattern,
            invalid: defaultFileNamePatternInvalid,
            extension: ".md"
        },
        {
            label: "Text Document",
            tooltip: "A plain text file",
            exemplar: "document.text",
            regex: defaultFileNamePattern,
            invalid: defaultFileNamePatternInvalid,
            extension: ".txt"
        },
        {
            label: "HTML Document",
            tooltip: "A HTML document you can edit directly using the HTML markup",
            exemplar: "document.html",
            regex: defaultFileNamePattern,
            invalid: defaultFileNamePatternInvalid,
            extension: ".html"
        },
        {
            label: "XML Document",
            tooltip: "An empty XML document",
            exemplar: "document.xml",
            regex: defaultFileNamePattern,
            invalid: defaultFileNamePatternInvalid,
            extension: ".xml"
        },
        {
            label: "Integration Flows",
            tooltip: "Camel routes for defining your integration flows",
            children: [
                {
                    label: "Camel XML document",
                    tooltip: "A vanilla Camel XML document for integration flows",
                    icon: "/img/icons/camel.svg",
                    exemplar: "camel.xml",
                    regex: defaultFileNamePattern,
                    invalid: defaultFileNamePatternInvalid,
                    extension: ".xml"
                },
                {
                    label: "Camel OSGi Blueprint XML document",
                    tooltip: "A vanilla Camel XML document for integration flows when using OSGi Blueprint",
                    icon: "/img/icons/camel.svg",
                    exemplar: "camel-blueprint.xml",
                    regex: defaultFileNamePattern,
                    invalid: defaultFileNamePatternInvalid,
                    extension: ".xml"
                },
                {
                    label: "Camel Spring XML document",
                    tooltip: "A vanilla Camel XML document for integration flows when using the Spring framework",
                    icon: "/img/icons/camel.svg",
                    exemplar: "camel-spring.xml",
                    regex: defaultFileNamePattern,
                    invalid: defaultFileNamePatternInvalid,
                    extension: ".xml"
                }
            ]
        },
        {
            label: "Data Mapping Document",
            tooltip: "Dozer based configuration of mapping documents",
            icon: "/img/icons/dozer/dozer.gif",
            exemplar: "dozer-mapping.xml",
            regex: defaultFileNamePattern,
            invalid: defaultFileNamePatternInvalid,
            extension: ".xml"
        }
    ];
    function isFMCContainer(workspace) {
        return false;
    }
    Wiki.isFMCContainer = isFMCContainer;
    function isWikiEnabled(workspace, jolokia, localStorage) {
        return Git.createGitRepository(workspace, jolokia, localStorage) !== null;
    }
    Wiki.isWikiEnabled = isWikiEnabled;
    function goToLink(link, $timeout, $location) {
        var href = Core.trimLeading(link, "#");
        $timeout(function () {
            Wiki.log.debug("About to navigate to: " + href);
            $location.url(href);
        }, 100);
    }
    Wiki.goToLink = goToLink;
    /**
     * Returns all the links for the given branch for the custom views, starting with "/"
     * @param $scope
     * @returns {string[]}
     */
    function customViewLinks($scope) {
        var branch = $scope.branch;
        var prefix = Core.trimLeading(Wiki.startLink(branch), "#");
        return Wiki.customWikiViewPages.map(function (path) { return prefix + path; });
    }
    Wiki.customViewLinks = customViewLinks;
    /**
     * Returns a new create document wizard tree
     * @method createWizardTree
     * @for Wiki
     * @static
     */
    function createWizardTree(workspace, $scope) {
        var root = new Folder("New Documents");
        addCreateWizardFolders(workspace, $scope, root, Wiki.documentTemplates);
        return root;
    }
    Wiki.createWizardTree = createWizardTree;
    function addCreateWizardFolders(workspace, $scope, parent, templates) {
        angular.forEach(templates, function (template) {
            if (template['fabricOnly'] && !Fabric.hasFabric(workspace)) {
                return;
            }
            if (template.generated) {
                if (template.generated.mbean) {
                    var exists = workspace.treeContainsDomainAndProperties.apply(workspace, template.generated.mbean);
                    if (!exists) {
                        return;
                    }
                }
                if (template.generated.init) {
                    template.generated.init(workspace, $scope);
                }
            }
            var title = template.label || key;
            var node = new Folder(title);
            node.parent = parent;
            node.entity = template;
            var addClass = template.addClass;
            if (addClass) {
                node.addClass = addClass;
            }
            var key = template.exemplar;
            var parentKey = parent.key || "";
            node.key = parentKey ? parentKey + "_" + key : key;
            var icon = template.icon;
            if (icon) {
                node.icon = Core.url(icon);
            }
            // compiler was complaining about 'label' had no idea where it's coming from
            // var tooltip = value["tooltip"] || value["description"] || label;
            var tooltip = template["tooltip"] || template["description"] || '';
            node.tooltip = tooltip;
            if (template["folder"]) {
                node.isFolder = function () {
                    return true;
                };
            }
            parent.children.push(node);
            var children = template.children;
            if (children) {
                addCreateWizardFolders(workspace, $scope, node, children);
            }
        });
    }
    Wiki.addCreateWizardFolders = addCreateWizardFolders;
    function startLink(branch) {
        var start = "#/wiki";
        if (branch) {
            start += "/branch/" + branch;
        }
        return start;
    }
    Wiki.startLink = startLink;
    /**
     * Returns true if the given filename/path is an index page (named index.* and is a markdown/html page).
     *
     * @param path
     * @returns {boolean}
     */
    function isIndexPage(path) {
        return path && (path.endsWith("index.md") || path.endsWith("index.html") || path.endsWith("index")) ? true : false;
    }
    Wiki.isIndexPage = isIndexPage;
    function viewLink(branch, pageId, $location, fileName) {
        if (fileName === void 0) { fileName = null; }
        var link = null;
        var start = startLink(branch);
        if (pageId) {
            // figure out which view to use for this page
            var view = isIndexPage(pageId) ? "/book/" : "/view/";
            link = start + view + encodePath(Core.trimLeading(pageId, "/"));
        }
        else {
            // lets use the current path
            var path = $location.path();
            link = "#" + path.replace(/(edit|create)/, "view");
        }
        if (fileName && pageId && pageId.endsWith(fileName)) {
            return link;
        }
        if (fileName) {
            if (!link.endsWith("/")) {
                link += "/";
            }
            link += fileName;
        }
        return link;
    }
    Wiki.viewLink = viewLink;
    function branchLink(branch, pageId, $location, fileName) {
        if (fileName === void 0) { fileName = null; }
        return viewLink(branch, pageId, $location, fileName);
    }
    Wiki.branchLink = branchLink;
    function editLink(branch, pageId, $location) {
        var link = null;
        var format = Wiki.fileFormat(pageId);
        switch (format) {
            case "image":
                break;
            default:
                var start = startLink(branch);
                if (pageId) {
                    link = start + "/edit/" + encodePath(pageId);
                }
                else {
                    // lets use the current path
                    var path = $location.path();
                    link = "#" + path.replace(/(view|create)/, "edit");
                }
        }
        return link;
    }
    Wiki.editLink = editLink;
    function createLink(branch, pageId, $location, $scope) {
        var path = $location.path();
        var start = startLink(branch);
        var link = '';
        if (pageId) {
            link = start + "/create/" + encodePath(pageId);
        }
        else {
            // lets use the current path
            link = "#" + path.replace(/(view|edit|formTable)/, "create");
        }
        // we have the link so lets now remove the last path
        // or if there is no / in the path then remove the last section
        var idx = link.lastIndexOf("/");
        if (idx > 0 && !$scope.children && !path.startsWith("/wiki/formTable")) {
            link = link.substring(0, idx + 1);
        }
        return link;
    }
    Wiki.createLink = createLink;
    function encodePath(pageId) {
        return pageId.split("/").map(encodeURIComponent).join("/");
    }
    Wiki.encodePath = encodePath;
    function decodePath(pageId) {
        return pageId.split("/").map(decodeURIComponent).join("/");
    }
    Wiki.decodePath = decodePath;
    function fileFormat(name, fileExtensionTypeRegistry) {
        var extension = fileExtension(name);
        var answer = null;
        if (!fileExtensionTypeRegistry) {
            fileExtensionTypeRegistry = HawtioCore.injector.get("fileExtensionTypeRegistry");
        }
        angular.forEach(fileExtensionTypeRegistry, function (array, key) {
            if (array.indexOf(extension) >= 0) {
                answer = key;
            }
        });
        return answer;
    }
    Wiki.fileFormat = fileFormat;
    /**
     * Returns the file name of the given path; stripping off any directories
     * @method fileName
     * @for Wiki
     * @static
     * @param {String} path
     * @return {String}
     */
    function fileName(path) {
        if (path) {
            var idx = path.lastIndexOf("/");
            if (idx > 0) {
                return path.substring(idx + 1);
            }
        }
        return path;
    }
    Wiki.fileName = fileName;
    /**
     * Returns the folder of the given path (everything but the last path name)
     * @method fileParent
     * @for Wiki
     * @static
     * @param {String} path
     * @return {String}
     */
    function fileParent(path) {
        if (path) {
            var idx = path.lastIndexOf("/");
            if (idx > 0) {
                return path.substring(0, idx);
            }
        }
        // lets return the root directory
        return "";
    }
    Wiki.fileParent = fileParent;
    /**
     * Returns the file name for the given name; we hide some extensions
     * @method hideFineNameExtensions
     * @for Wiki
     * @static
     * @param {String} name
     * @return {String}
     */
    function hideFileNameExtensions(name) {
        if (name) {
            angular.forEach(Wiki.hideExtensions, function (extension) {
                if (name.endsWith(extension)) {
                    name = name.substring(0, name.length - extension.length);
                }
            });
        }
        return name;
    }
    Wiki.hideFileNameExtensions = hideFileNameExtensions;
    /**
     * Returns the URL to perform a GET or POST for the given branch name and path
     */
    function gitRestURL(branch, path) {
        var url = gitRelativeURL(branch, path);
        url = Core.url('/' + url);
        var connectionName = Core.getConnectionNameParameter(location.search);
        if (connectionName) {
            var connectionOptions = Core.getConnectOptions(connectionName);
            if (connectionOptions) {
                connectionOptions.path = url;
                url = Core.createServerConnectionUrl(connectionOptions);
            }
        }
        return url;
    }
    Wiki.gitRestURL = gitRestURL;
    /**
     * Returns a relative URL to perform a GET or POST for the given branch/path
     */
    function gitRelativeURL(branch, path) {
        branch = branch || "master";
        path = path || "/";
        return UrlHelpers.join("git/" + branch, path);
    }
    Wiki.gitRelativeURL = gitRelativeURL;
    /**
     * Takes a row containing the entity object; or can take the entity directly.
     *
     * It then uses the name, directory and xmlNamespaces properties
     *
     * @method fileIconHtml
     * @for Wiki
     * @static
     * @param {any} row
     * @return {String}
     *
     */
    function fileIconHtml(row) {
        var name = row.name;
        var path = row.path;
        var branch = row.branch;
        var directory = row.directory;
        var xmlNamespaces = row.xmlNamespaces;
        var iconUrl = row.iconUrl;
        var entity = row.entity;
        if (entity) {
            name = name || entity.name;
            path = path || entity.path;
            branch = branch || entity.branch;
            directory = directory || entity.directory;
            xmlNamespaces = xmlNamespaces || entity.xmlNamespaces;
            iconUrl = iconUrl || entity.iconUrl;
        }
        branch = branch || "master";
        var css = null;
        var icon = null;
        var extension = fileExtension(name);
        // TODO could we use different icons for markdown v xml v html
        if (xmlNamespaces && xmlNamespaces.length) {
            if (xmlNamespaces.any(function (ns) { return Wiki.camelNamespaces.any(ns); })) {
                icon = "img/icons/camel.svg";
            }
            else if (xmlNamespaces.any(function (ns) { return Wiki.dozerNamespaces.any(ns); })) {
                icon = "img/icons/dozer/dozer.gif";
            }
            else if (xmlNamespaces.any(function (ns) { return Wiki.activemqNamespaces.any(ns); })) {
                icon = "img/icons/messagebroker.svg";
            }
            else {
                Wiki.log.debug("file " + name + " has namespaces " + xmlNamespaces);
            }
        }
        if (iconUrl) {
            css = null;
            icon = UrlHelpers.join("git", iconUrl);
            var connectionName = Core.getConnectionNameParameter(location.search);
            if (connectionName) {
                var connectionOptions = Core.getConnectOptions(connectionName);
                if (connectionOptions) {
                    connectionOptions.path = Core.url('/' + icon);
                    icon = Core.createServerConnectionUrl(connectionOptions);
                }
            }
        }
        if (!icon) {
            if (directory) {
                switch (extension) {
                    case 'profile':
                        css = "icon-book";
                        break;
                    default:
                        // log.debug("No match for extension: ", extension, " using a generic folder icon");
                        css = "icon-folder-close";
                }
            }
            else {
                switch (extension) {
                    case 'png':
                    case 'svg':
                    case 'jpg':
                    case 'gif':
                        css = null;
                        icon = Wiki.gitRelativeURL(branch, path);
                        var connectionName = Core.getConnectionNameParameter(location.search);
                        if (connectionName) {
                            var connectionOptions = Core.getConnectOptions(connectionName);
                            if (connectionOptions) {
                                connectionOptions.path = Core.url('/' + icon);
                                icon = Core.createServerConnectionUrl(connectionOptions);
                            }
                        }
                        break;
                    case 'json':
                    case 'xml':
                        css = "icon-file-text";
                        break;
                    case 'md':
                        css = "icon-file-text-alt";
                        break;
                    default:
                        // log.debug("No match for extension: ", extension, " using a generic file icon");
                        css = "icon-file-alt";
                }
            }
        }
        if (icon) {
            return "<img src='" + Core.url(icon) + "'>";
        }
        else {
            return "<i class='" + css + "'></i>";
        }
    }
    Wiki.fileIconHtml = fileIconHtml;
    function iconClass(row) {
        var name = row.getProperty("name");
        var extension = fileExtension(name);
        var directory = row.getProperty("directory");
        if (directory) {
            return "icon-folder-close";
        }
        if ("xml" === extension) {
            return "icon-cog";
        }
        else if ("md" === extension) {
            return "icon-file-text-alt";
        }
        // TODO could we use different icons for markdown v xml v html
        return "icon-file-alt";
    }
    Wiki.iconClass = iconClass;
    /**
     * Extracts the pageId, branch, objectId from the route parameters
     * @method initScope
     * @for Wiki
     * @static
     * @param {*} $scope
     * @param {any} $routeParams
     * @param {ng.ILocationService} $location
     */
    function initScope($scope, $routeParams, $location) {
        $scope.pageId = Wiki.pageId($routeParams, $location);
        $scope.branch = $routeParams["branch"] || $location.search()["branch"];
        $scope.objectId = $routeParams["objectId"];
        $scope.startLink = Wiki.startLink($scope.branch);
        $scope.historyLink = startLink($scope.branch) + "/history/" + ($scope.pageId || "");
    }
    Wiki.initScope = initScope;
    /**
     * Loads the branches for this wiki repository and stores them in the branches property in
     * the $scope and ensures $scope.branch is set to a valid value
     *
     * @param wikiRepository
     * @param $scope
     * @param isFmc whether we run as fabric8 or as hawtio
     */
    function loadBranches(jolokia, wikiRepository, $scope, isFmc) {
        if (isFmc === void 0) { isFmc = false; }
        if (isFmc) {
            // when using fabric then the branches is the fabric versions, so we should use that instead
            $scope.branches = Fabric.getVersionIds(jolokia);
            var defaultVersion = Fabric.getDefaultVersionId(jolokia);
            // use current default version as default branch
            if (!$scope.branch) {
                $scope.branch = defaultVersion;
            }
            // lets sort by version number
            $scope.branches = $scope.branches.sortBy(function (v) { return Core.versionToSortableString(v); }, true);
            Core.$apply($scope);
        }
        else {
            wikiRepository.branches(function (response) {
                // lets sort by version number
                $scope.branches = response.sortBy(function (v) { return Core.versionToSortableString(v); }, true);
                // default the branch name if we have 'master'
                if (!$scope.branch && $scope.branches.find(function (branch) {
                    return branch === "master";
                })) {
                    $scope.branch = "master";
                }
                Core.$apply($scope);
            });
        }
    }
    Wiki.loadBranches = loadBranches;
    /**
     * Extracts the pageId from the route parameters
     * @method pageId
     * @for Wiki
     * @static
     * @param {any} $routeParams
     * @param @ng.ILocationService @location
     * @return {String}
     */
    function pageId($routeParams, $location) {
        var pageId = $routeParams['page'];
        if (!pageId) {
            for (var i = 0; i < 100; i++) {
                var value = $routeParams['path' + i];
                if (angular.isDefined(value)) {
                    if (!pageId) {
                        pageId = value;
                    }
                    else {
                        pageId += "/" + value;
                    }
                }
                else
                    break;
            }
            return pageId || "/";
        }
        // if no $routeParams variables lets figure it out from the $location
        if (!pageId) {
            pageId = pageIdFromURI($location.path());
        }
        return pageId;
    }
    Wiki.pageId = pageId;
    function pageIdFromURI(url) {
        var wikiPrefix = "/wiki/";
        if (url && url.startsWith(wikiPrefix)) {
            var idx = url.indexOf("/", wikiPrefix.length + 1);
            if (idx > 0) {
                return url.substring(idx + 1, url.length);
            }
        }
        return null;
    }
    Wiki.pageIdFromURI = pageIdFromURI;
    function fileExtension(name) {
        if (name.indexOf('#') > 0)
            name = name.substring(0, name.indexOf('#'));
        return Core.fileExtension(name, "markdown");
    }
    Wiki.fileExtension = fileExtension;
    function onComplete(status) {
        console.log("Completed operation with status: " + JSON.stringify(status));
    }
    Wiki.onComplete = onComplete;
    /**
     * Parses the given JSON text reporting to the user if there is a parse error
     * @method parseJson
     * @for Wiki
     * @static
     * @param {String} text
     * @return {any}
     */
    function parseJson(text) {
        if (text) {
            try {
                return JSON.parse(text);
            }
            catch (e) {
                Core.notification("error", "Failed to parse JSON: " + e);
            }
        }
        return null;
    }
    Wiki.parseJson = parseJson;
    /**
     * Adjusts a relative or absolute link from a wiki or file system to one using the hash bang syntax
     * @method adjustHref
     * @for Wiki
     * @static
     * @param {*} $scope
     * @param {ng.ILocationService} $location
     * @param {String} href
     * @param {String} fileExtension
     * @return {string}
     */
    function adjustHref($scope, $location, href, fileExtension) {
        var extension = fileExtension ? "." + fileExtension : "";
        // if the last part of the path has a dot in it lets
        // exclude it as we are relative to a markdown or html file in a folder
        // such as when viewing readme.md or index.md
        var path = $location.path();
        var folderPath = path;
        var idx = path.lastIndexOf("/");
        if (idx > 0) {
            var lastName = path.substring(idx + 1);
            if (lastName.indexOf(".") >= 0) {
                folderPath = path.substring(0, idx);
            }
        }
        // Deal with relative URLs first...
        if (href.startsWith('../')) {
            var parts = href.split('/');
            var pathParts = folderPath.split('/');
            var parents = parts.filter(function (part) {
                return part === "..";
            });
            parts = parts.last(parts.length - parents.length);
            pathParts = pathParts.first(pathParts.length - parents.length);
            return '#' + pathParts.join('/') + '/' + parts.join('/') + extension + $location.hash();
        }
        // Turn an absolute link into a wiki link...
        if (href.startsWith('/')) {
            return Wiki.branchLink($scope.branch, href + extension, $location) + extension;
        }
        if (!Wiki.excludeAdjustmentPrefixes.any(function (exclude) {
            return href.startsWith(exclude);
        })) {
            return '#' + folderPath + "/" + href + extension + $location.hash();
        }
        else {
            return null;
        }
    }
    Wiki.adjustHref = adjustHref;
})(Wiki || (Wiki = {}));

/// <reference path="../../includes.ts"/>
/// <reference path="activemqHelpers.ts"/>
/// <reference path="../../wiki/ts/wikiHelpers.ts"/>
var ActiveMQ;
(function (ActiveMQ) {
    ActiveMQ._module.controller("ActiveMQ.BrokerDiagramController", ["$scope", "$compile", "$location", "localStorage", "jolokia", "workspace", function ($scope, $compile, $location, localStorage, jolokia, workspace) {
        Fabric.initScope($scope, $location, jolokia, workspace);
        var isFmc = Wiki.isFMCContainer(workspace);
        $scope.isFmc = isFmc;
        $scope.selectedNode = null;
        var defaultFlags = {
            panel: true,
            popup: false,
            label: true,
            group: false,
            profile: false,
            slave: false,
            broker: isFmc,
            network: true,
            container: false,
            queue: true,
            topic: true,
            consumer: true,
            producer: true
        };
        $scope.viewSettings = {};
        $scope.shapeSize = {
            broker: 20,
            queue: 14,
            topic: 14
        };
        var redrawGraph = Core.throttled(doRedrawGraph, 1000);
        var graphBuilder = new ForceGraph.GraphBuilder();
        Core.bindModelToSearchParam($scope, $location, "searchFilter", "q", "");
        angular.forEach(defaultFlags, function (defaultValue, key) {
            var modelName = "viewSettings." + key;
            // bind model values to search params...
            function currentValue() {
                var answer = $location.search()[paramName] || defaultValue;
                return answer === "false" ? false : answer;
            }
            var paramName = key;
            var value = currentValue();
            Core.pathSet($scope, modelName, value);
            $scope.$watch(modelName, function () {
                var current = Core.pathGet($scope, modelName);
                var old = currentValue();
                if (current !== old) {
                    var defaultValue = defaultFlags[key];
                    if (current !== defaultValue) {
                        if (!current) {
                            current = "false";
                        }
                        $location.search(paramName, current);
                    }
                    else {
                        $location.search(paramName, null);
                    }
                }
                redrawGraph();
            });
        });
        $scope.connectToBroker = function () {
            var selectedNode = $scope.selectedNode;
            if (selectedNode) {
                var container = selectedNode["brokerContainer"] || selectedNode;
                connectToBroker(container, selectedNode["brokerName"]);
            }
        };
        function connectToBroker(container, brokerName, postfix) {
            if (postfix === void 0) { postfix = null; }
            if (isFmc && container.jolokia !== jolokia) {
                Fabric.connectToBroker($scope, container, postfix);
            }
            else {
                var view = "/jmx/attributes?tab=activemq";
                if (!postfix) {
                    if (brokerName) {
                        // lets default to the broker view
                        postfix = "nid=root-org.apache.activemq-Broker-" + brokerName;
                    }
                }
                if (postfix) {
                    view += "&" + postfix;
                }
                ActiveMQ.log.info("Opening view " + view);
                var path = Core.url("/#" + view);
                window.open(path, '_destination');
                window.focus();
            }
        }
        $scope.connectToDestination = function () {
            var selectedNode = $scope.selectedNode;
            if (selectedNode) {
                var container = selectedNode["brokerContainer"] || selectedNode;
                var brokerName = selectedNode["brokerName"];
                var destinationType = selectedNode["destinationType"] || selectedNode["typeLabel"];
                var destinationName = selectedNode["destinationName"];
                var postfix = null;
                if (brokerName && destinationType && destinationName) {
                    postfix = "nid=root-org.apache.activemq-Broker-" + brokerName + "-" + destinationType + "-" + destinationName;
                }
                connectToBroker(container, brokerName, postfix);
            }
        };
        $scope.$on('$destroy', function (event) {
            stopOldJolokia();
        });
        function stopOldJolokia() {
            var oldJolokia = $scope.selectedNodeJolokia;
            if (oldJolokia && oldJolokia !== jolokia) {
                oldJolokia.stop();
            }
        }
        $scope.$watch("selectedNode", function (newValue, oldValue) {
            // lets cancel any previously registered thingy
            if ($scope.unregisterFn) {
                $scope.unregisterFn();
                $scope.unregisterFn = null;
            }
            var node = $scope.selectedNode;
            if (node) {
                var mbean = node.objectName;
                var brokerContainer = node.brokerContainer || {};
                var nodeJolokia = node.jolokia || brokerContainer.jolokia || jolokia;
                if (nodeJolokia !== $scope.selectedNodeJolokia) {
                    stopOldJolokia();
                    $scope.selectedNodeJolokia = nodeJolokia;
                    if (nodeJolokia !== jolokia) {
                        var rate = Core.parseIntValue(localStorage['updateRate'] || "2000", "update rate");
                        if (rate) {
                            nodeJolokia.start(rate);
                        }
                    }
                }
                var dummyResponse = { value: node.panelProperties || {} };
                if (mbean && nodeJolokia) {
                    ActiveMQ.log.debug("reading ", mbean, " on remote container");
                    $scope.unregisterFn = Core.register(nodeJolokia, $scope, {
                        type: 'read',
                        mbean: mbean
                    }, Core.onSuccess(renderNodeAttributes, {
                        error: function (response) {
                            // probably we've got a wrong mbean name?
                            // so lets render at least
                            renderNodeAttributes(dummyResponse);
                            Core.defaultJolokiaErrorHandler(response);
                        }
                    }));
                }
                else {
                    ActiveMQ.log.debug("no mbean or jolokia available, using dummy response");
                    renderNodeAttributes(dummyResponse);
                }
            }
        });
        function getDestinationTypeName(attributes) {
            var prefix = attributes["DestinationTemporary"] ? "Temporary " : "";
            return prefix + (attributes["DestinationTopic"] ? "Topic" : "Queue");
        }
        var ignoreNodeAttributes = ["Broker", "BrokerId", "BrokerName", "Connection", "DestinationName", "DestinationQueue", "DestinationTemporary", "DestinationTopic",];
        var ignoreNodeAttributesByType = {
            producer: ["Producer", "ProducerId"],
            queue: ["Name", "MessageGroups", "MessageGroupType", "Subscriptions"],
            topic: ["Name", "Subscriptions"],
            broker: ["DataDirectory", "DurableTopicSubscriptions", "DynamicDestinationProducers", "InactiveDurableToppicSubscribers"]
        };
        var brokerShowProperties = ["AverageMessageSize", "BrokerId", "JobSchedulerStorePercentUsage", "Slave", "MemoryPercentUsage", "StorePercentUsage", "TempPercentUsage"];
        var onlyShowAttributesByType = {
            broker: brokerShowProperties,
            brokerSlave: brokerShowProperties
        };
        function renderNodeAttributes(response) {
            var properties = [];
            if (response) {
                var value = response.value || {};
                $scope.selectedNodeAttributes = value;
                var selectedNode = $scope.selectedNode || {};
                var brokerContainer = selectedNode['brokerContainer'] || {};
                var nodeType = selectedNode["type"];
                var brokerName = selectedNode["brokerName"];
                var containerId = selectedNode["container"] || brokerContainer["container"];
                var group = selectedNode["group"] || brokerContainer["group"];
                var jolokiaUrl = selectedNode["jolokiaUrl"] || brokerContainer["jolokiaUrl"];
                var profile = selectedNode["profile"] || brokerContainer["profile"];
                var version = selectedNode["version"] || brokerContainer["version"];
                var isBroker = nodeType && nodeType.startsWith("broker");
                var ignoreKeys = ignoreNodeAttributes.concat(ignoreNodeAttributesByType[nodeType] || []);
                var onlyShowKeys = onlyShowAttributesByType[nodeType];
                angular.forEach(value, function (v, k) {
                    if (onlyShowKeys ? onlyShowKeys.indexOf(k) >= 0 : ignoreKeys.indexOf(k) < 0) {
                        var formattedValue = Core.humanizeValueHtml(v);
                        properties.push({ key: Core.humanizeValue(k), value: formattedValue });
                    }
                });
                properties = properties.sortBy("key");
                var brokerProperty = null;
                if (brokerName) {
                    var brokerHtml = '<a target="broker" ng-click="connectToBroker()">' + '<img title="Apache ActiveMQ" src="img/icons/messagebroker.svg"> ' + brokerName + '</a>';
                    if (version && profile) {
                        var brokerLink = Fabric.brokerConfigLink(workspace, jolokia, localStorage, version, profile, brokerName);
                        if (brokerLink) {
                            brokerHtml += ' <a title="configuration settings" target="brokerConfig" href="' + brokerLink + '"><i class="icon-tasks"></i></a>';
                        }
                    }
                    var html = $compile(brokerHtml)($scope);
                    brokerProperty = { key: "Broker", value: html };
                    if (!isBroker) {
                        properties.splice(0, 0, brokerProperty);
                    }
                }
                if (containerId) {
                    //var containerModel = "selectedNode" + (selectedNode['brokerContainer'] ? ".brokerContainer" : "");
                    properties.splice(0, 0, { key: "Container", value: $compile('<div fabric-container-link="' + selectedNode['container'] + '"></div>')($scope) });
                }
                var destinationName = value["DestinationName"] || selectedNode["destinationName"];
                if (destinationName && (nodeType !== "queue" && nodeType !== "topic")) {
                    var destinationTypeName = getDestinationTypeName(value);
                    var html = createDestinationLink(destinationName, destinationTypeName);
                    properties.splice(0, 0, { key: destinationTypeName, value: html });
                }
                var typeLabel = selectedNode["typeLabel"];
                var name = selectedNode["name"] || selectedNode["id"] || selectedNode['objectName'];
                if (typeLabel) {
                    var html = name;
                    if (nodeType === "queue" || nodeType === "topic") {
                        html = createDestinationLink(name, nodeType);
                    }
                    var typeProperty = { key: typeLabel, value: html };
                    if (isBroker && brokerProperty) {
                        typeProperty = brokerProperty;
                    }
                    properties.splice(0, 0, typeProperty);
                }
            }
            $scope.selectedNodeProperties = properties;
            Core.$apply($scope);
        }
        /**
         * Generates the HTML for a link to the destination
         */
        function createDestinationLink(destinationName, destinationType) {
            if (destinationType === void 0) { destinationType = "queue"; }
            return $compile('<a target="destination" title="' + destinationName + '" ng-click="connectToDestination()">' + destinationName + '</a>')($scope);
        }
        $scope.$watch("searchFilter", function (newValue, oldValue) {
            redrawGraph();
        });
        if (isFmc) {
            Core.register(jolokia, $scope, { type: 'exec', mbean: Fabric.mqManagerMBean, operation: "loadBrokerStatus()" }, Core.onSuccess(onBrokerData));
        }
        else {
            // lets just use the current stuff from the workspace
            $scope.$watch('workspace.tree', function () {
                redrawGraph();
            });
            $scope.$on('jmxTreeUpdated', function () {
                redrawGraph();
            });
        }
        function onBrokerData(response) {
            if (response) {
                var responseJson = angular.toJson(response.value);
                if ($scope.responseJson === responseJson) {
                    return;
                }
                $scope.responseJson = responseJson;
                $scope.brokers = response.value;
                doRedrawGraph();
            }
        }
        function redrawFabricBrokers() {
            var containersToDelete = $scope.activeContainers || {};
            $scope.activeContainers = {};
            angular.forEach($scope.brokers, function (brokerStatus) {
                // only query master brokers which are provisioned correctly
                brokerStatus.validContainer = brokerStatus.alive && brokerStatus.master && brokerStatus.provisionStatus === "success";
                // don't use type field so we can use it for the node types..
                renameTypeProperty(brokerStatus);
                //log.info("Broker status: " + angular.toJson(brokerStatus, true));
                var groupId = brokerStatus.group;
                var profileId = brokerStatus.profile;
                var brokerId = brokerStatus.brokerName;
                var containerId = brokerStatus.container;
                var versionId = brokerStatus.version || "1.0";
                var group = getOrAddNode("group", groupId, brokerStatus, function () {
                    return {
                        /*
                         navUrl: ,
                         image: {
                         url: "/hawtio/img/icons/osgi/bundle.png",
                         width: 32,
                         height:32
                         },
                         */
                        typeLabel: "Broker Group",
                        popup: {
                            title: "Broker Group: " + groupId,
                            content: "<p>" + groupId + "</p>"
                        }
                    };
                });
                var profile = getOrAddNode("profile", profileId, brokerStatus, function () {
                    return {
                        typeLabel: "Profile",
                        popup: {
                            title: "Profile: " + profileId,
                            content: "<p>" + profileId + "</p>"
                        }
                    };
                });
                // TODO do we need to create a physical broker node per container and logical broker maybe?
                var container = null;
                if (containerId) {
                    container = getOrAddNode("container", containerId, brokerStatus, function () {
                        return {
                            containerId: containerId,
                            typeLabel: "Container",
                            popup: {
                                title: "Container: " + containerId,
                                content: "<p>" + containerId + " version: " + versionId + "</p>"
                            }
                        };
                    });
                }
                var master = brokerStatus.master;
                var broker = getOrAddBroker(master, brokerId, groupId, containerId, container, brokerStatus);
                if (container && container.validContainer) {
                    var key = container.containerId;
                    $scope.activeContainers[key] = container;
                    delete containersToDelete[key];
                }
                // add the links...
                if ($scope.viewSettings.group) {
                    if ($scope.viewSettings.profile) {
                        addLink(group, profile, "group");
                        addLink(profile, broker, "broker");
                    }
                    else {
                        addLink(group, broker, "group");
                    }
                }
                else {
                    if ($scope.viewSettings.profile) {
                        addLink(profile, broker, "broker");
                    }
                }
                if (container) {
                    if ((master || $scope.viewSettings.slave) && $scope.viewSettings.container) {
                        addLink(broker, container, "container");
                        container.destinationLinkNode = container;
                    }
                    else {
                        container.destinationLinkNode = broker;
                    }
                }
            });
            redrawActiveContainers();
        }
        function redrawLocalBroker() {
            var container = {
                jolokia: jolokia
            };
            var containerId = "local";
            $scope.activeContainers = {
                containerId: container
            };
            if ($scope.viewSettings.broker) {
                jolokia.search("org.apache.activemq:type=Broker,brokerName=*", Core.onSuccess(function (response) {
                    angular.forEach(response, function (objectName) {
                        var details = Core.parseMBean(objectName);
                        if (details) {
                            var properties = details['attributes'];
                            ActiveMQ.log.info("Got broker: " + objectName + " on container: " + containerId + " properties: " + angular.toJson(properties, true));
                            if (properties) {
                                var master = true;
                                var brokerId = properties["brokerName"] || "unknown";
                                var groupId = "";
                                var broker = getOrAddBroker(master, brokerId, groupId, containerId, container, properties);
                            }
                        }
                    });
                    redrawActiveContainers();
                }));
            }
            else {
                redrawActiveContainers();
            }
        }
        function redrawActiveContainers() {
            // TODO delete any nodes from dead containers in containersToDelete
            angular.forEach($scope.activeContainers, function (container, id) {
                var containerJolokia = container.jolokia;
                if (containerJolokia) {
                    onContainerJolokia(containerJolokia, container, id);
                }
                else {
                    Fabric.containerJolokia(jolokia, id, function (containerJolokia) { return onContainerJolokia(containerJolokia, container, id); });
                }
            });
            $scope.graph = graphBuilder.buildGraph();
            Core.$apply($scope);
        }
        function doRedrawGraph() {
            graphBuilder = new ForceGraph.GraphBuilder();
            if (isFmc) {
                redrawFabricBrokers();
            }
            else {
                redrawLocalBroker();
            }
        }
        function brokerNameMarkup(brokerName) {
            return brokerName ? "<p></p>broker: " + brokerName + "</p>" : "";
        }
        function matchesDestinationName(destinationName, typeName) {
            if (destinationName) {
                var selection = workspace.selection;
                if (selection && selection.domain === ActiveMQ.jmxDomain) {
                    var type = selection.entries["destinationType"];
                    if (type) {
                        if ((type === "Queue" && typeName === "topic") || (type === "Topic" && typeName === "queue")) {
                            return false;
                        }
                    }
                    var destName = selection.entries["destinationName"];
                    if (destName) {
                        if (destName !== destinationName)
                            return false;
                    }
                }
                ActiveMQ.log.info("selection: " + selection);
                // TODO if the current selection is a destination...
                return !$scope.searchFilter || destinationName.indexOf($scope.searchFilter) >= 0;
            }
            return false;
        }
        function onContainerJolokia(containerJolokia, container, id) {
            if (containerJolokia) {
                container.jolokia = containerJolokia;
                function getOrAddDestination(properties) {
                    var typeName = properties.destType;
                    var brokerName = properties.brokerName;
                    var destinationName = properties.destinationName;
                    if (!matchesDestinationName(destinationName, typeName)) {
                        return null;
                    }
                    // should we be filtering this destination out
                    var hideFlag = "topic" === typeName ? $scope.viewSettings.topic : $scope.viewSettings.queue;
                    if (!hideFlag) {
                        return null;
                    }
                    var destination = getOrAddNode(typeName, destinationName, properties, function () {
                        var destinationTypeName = properties.destinationType || "Queue";
                        var objectName = "";
                        if (brokerName) {
                            // lets ignore temp topic stuff as there's no mbean for these
                            if (!destinationName.startsWith("ActiveMQ.Advisory.TempQueue_ActiveMQ.Advisory.TempTopic")) {
                                objectName = "org.apache.activemq:type=Broker,brokerName=" + brokerName + ",destinationType=" + destinationTypeName + ",destinationName=" + destinationName;
                            }
                        }
                        var answer = {
                            typeLabel: destinationTypeName,
                            brokerContainer: container,
                            objectName: objectName,
                            jolokia: containerJolokia,
                            popup: {
                                title: destinationTypeName + ": " + destinationName,
                                content: brokerNameMarkup(properties.brokerName)
                            }
                        };
                        if (!brokerName) {
                            containerJolokia.search("org.apache.activemq:destinationType=" + destinationTypeName + ",destinationName=" + destinationName + ",*", Core.onSuccess(function (response) {
                                ActiveMQ.log.info("Found destination mbean: " + response);
                                if (response && response.length) {
                                    answer.objectName = response[0];
                                }
                            }));
                        }
                        return answer;
                    });
                    if (destination && $scope.viewSettings.broker && brokerName) {
                        addLinkIds(brokerNodeId(brokerName), destination["id"], "destination");
                    }
                    return destination;
                }
                // find networks
                var brokerId = container.brokerName;
                if (brokerId && $scope.viewSettings.network && $scope.viewSettings.broker) {
                    containerJolokia.request({ type: "read", mbean: "org.apache.activemq:connector=networkConnectors,*" }, Core.onSuccess(function (response) {
                        angular.forEach(response.value, function (properties, objectName) {
                            var details = Core.parseMBean(objectName);
                            var attributes = details['attributes'];
                            if (properties) {
                                configureDestinationProperties(properties);
                                var remoteBrokerId = properties.RemoteBrokerName;
                                if (remoteBrokerId) {
                                    addLinkIds(brokerNodeId(brokerId), brokerNodeId(remoteBrokerId), "network");
                                }
                            }
                        });
                        graphModelUpdated();
                    }));
                }
                // find consumers
                if ($scope.viewSettings.consumer) {
                    containerJolokia.search("org.apache.activemq:endpoint=Consumer,*", Core.onSuccess(function (response) {
                        angular.forEach(response, function (objectName) {
                            //log.info("Got consumer: " + objectName + " on container: " + id);
                            var details = Core.parseMBean(objectName);
                            if (details) {
                                var properties = details['attributes'];
                                if (properties) {
                                    configureDestinationProperties(properties);
                                    var consumerId = properties.consumerId;
                                    if (consumerId) {
                                        var destination = getOrAddDestination(properties);
                                        if (destination) {
                                            addLink(container.destinationLinkNode, destination, "destination");
                                            var consumer = getOrAddNode("consumer", consumerId, properties, function () {
                                                return {
                                                    typeLabel: "Consumer",
                                                    brokerContainer: container,
                                                    objectName: objectName,
                                                    jolokia: containerJolokia,
                                                    popup: {
                                                        title: "Consumer: " + consumerId,
                                                        content: "<p>client: " + (properties.clientId || "") + "</p> " + brokerNameMarkup(properties.brokerName)
                                                    }
                                                };
                                            });
                                            addLink(destination, consumer, "consumer");
                                        }
                                    }
                                }
                            }
                        });
                        graphModelUpdated();
                    }));
                }
                // find producers
                if ($scope.viewSettings.producer) {
                    containerJolokia.search("org.apache.activemq:endpoint=Producer,*", Core.onSuccess(function (response) {
                        angular.forEach(response, function (objectName) {
                            var details = Core.parseMBean(objectName);
                            if (details) {
                                var properties = details['attributes'];
                                if (properties) {
                                    configureDestinationProperties(properties);
                                    var producerId = properties.producerId;
                                    if (producerId) {
                                        var destination = getOrAddDestination(properties);
                                        if (destination) {
                                            addLink(container.destinationLinkNode, destination, "destination");
                                            var producer = getOrAddNode("producer", producerId, properties, function () {
                                                return {
                                                    typeLabel: "Producer",
                                                    brokerContainer: container,
                                                    objectName: objectName,
                                                    jolokia: containerJolokia,
                                                    popup: {
                                                        title: "Producer: " + producerId,
                                                        content: "<p>client: " + (properties.clientId || "") + "</p> " + brokerNameMarkup(properties.brokerName)
                                                    }
                                                };
                                            });
                                            addLink(producer, destination, "producer");
                                        }
                                        graphModelUpdated();
                                    }
                                }
                            }
                        });
                        graphModelUpdated();
                    }));
                }
                // find dynamic producers
                if ($scope.viewSettings.producer) {
                    containerJolokia.request({ type: "read", mbean: "org.apache.activemq:endpoint=dynamicProducer,*" }, Core.onSuccess(function (response) {
                        angular.forEach(response.value, function (mbeanValues, objectName) {
                            var details = Core.parseMBean(objectName);
                            var attributes = details['attributes'];
                            var properties = {};
                            angular.forEach(attributes, function (value, key) {
                                properties[key] = value;
                            });
                            angular.forEach(mbeanValues, function (value, key) {
                                properties[key] = value;
                            });
                            configureDestinationProperties(properties);
                            properties['destinationName'] = properties['DestinationName'];
                            var producerId = properties["producerId"] || properties["ProducerId"];
                            if (properties["DestinationTemporary"] || properties["DestinationTopc"]) {
                                properties["destType"] = "topic";
                            }
                            var destination = getOrAddDestination(properties);
                            if (producerId && destination) {
                                addLink(container.destinationLinkNode, destination, "destination");
                                var producer = getOrAddNode("producer", producerId, properties, function () {
                                    return {
                                        typeLabel: "Producer (Dynamic)",
                                        brokerContainer: container,
                                        objectName: objectName,
                                        jolokia: containerJolokia,
                                        popup: {
                                            title: "Producer (Dynamic): " + producerId,
                                            content: "<p>client: " + (properties['ClientId'] || "") + "</p> " + brokerNameMarkup(properties['brokerName'])
                                        }
                                    };
                                });
                                addLink(producer, destination, "producer");
                            }
                        });
                        graphModelUpdated();
                    }));
                }
            }
        }
        function graphModelUpdated() {
            $scope.graph = graphBuilder.buildGraph();
            Core.$apply($scope);
        }
        function getOrAddBroker(master, brokerId, groupId, containerId, container, brokerStatus) {
            var broker = null;
            var brokerFlag = master ? $scope.viewSettings.broker : $scope.viewSettings.slave;
            if (brokerFlag) {
                broker = getOrAddNode("broker", brokerId + (master ? "" : ":slave"), brokerStatus, function () {
                    return {
                        type: master ? "broker" : "brokerSlave",
                        typeLabel: master ? "Broker" : "Slave Broker",
                        popup: {
                            title: (master ? "Master" : "Slave") + " Broker: " + brokerId,
                            content: "<p>Container: " + containerId + "</p> <p>Group: " + groupId + "</p>"
                        }
                    };
                });
                if (master) {
                    if (!broker['objectName']) {
                        // lets try guess the mbean name
                        broker['objectName'] = "org.apache.activemq:type=Broker,brokerName=" + brokerId;
                        ActiveMQ.log.info("Guessed broker mbean: " + broker['objectName']);
                    }
                    if (!broker['brokerContainer'] && container) {
                        broker['brokerContainer'] = container;
                    }
                }
            }
            return broker;
        }
        function getOrAddNode(typeName, id, properties, createFn) {
            var node = null;
            if (id) {
                var nodeId = typeName + ":" + id;
                node = graphBuilder.getNode(nodeId);
                if (!node) {
                    var nodeValues = createFn();
                    node = angular.copy(properties);
                    angular.forEach(nodeValues, function (value, key) { return node[key] = value; });
                    node['id'] = nodeId;
                    if (!node['type']) {
                        node['type'] = typeName;
                    }
                    if (!node['name']) {
                        node['name'] = id;
                    }
                    if (node) {
                        var size = $scope.shapeSize[typeName];
                        if (size && !node['size']) {
                            node['size'] = size;
                        }
                        if (!node['summary']) {
                            node['summary'] = node['popup'] || "";
                        }
                        if (!$scope.viewSettings.popup) {
                            delete node['popup'];
                        }
                        if (!$scope.viewSettings.label) {
                            delete node['name'];
                        }
                        // lets not add nodes which are defined as being disabled
                        var enabled = $scope.viewSettings[typeName];
                        if (enabled || !angular.isDefined(enabled)) {
                            //log.info("Adding node " + nodeId + " of type + " + typeName);
                            graphBuilder.addNode(node);
                        }
                        else {
                        }
                    }
                }
            }
            return node;
        }
        function addLink(object1, object2, linkType) {
            if (object1 && object2) {
                addLinkIds(object1.id, object2.id, linkType);
            }
        }
        function addLinkIds(id1, id2, linkType) {
            if (id1 && id2) {
                graphBuilder.addLink(id1, id2, linkType);
            }
        }
        function brokerNodeId(brokerId) {
            return brokerId ? "broker:" + brokerId : null;
        }
        /**
           * Avoid the JMX type property clashing with the ForceGraph type property; used for associating css classes with nodes on the graph
           *
           * @param properties
           */
        function renameTypeProperty(properties) {
            properties.mbeanType = properties['type'];
            delete properties['type'];
        }
        function configureDestinationProperties(properties) {
            renameTypeProperty(properties);
            var destinationType = properties.destinationType || "Queue";
            var typeName = destinationType.toLowerCase();
            properties.isQueue = !typeName.startsWith("t");
            properties['destType'] = typeName;
        }
    }]);
})(ActiveMQ || (ActiveMQ = {}));

/// <reference path="../../includes.ts"/>
/// <reference path="activemqHelpers.ts"/>
var ActiveMQ;
(function (ActiveMQ) {
    ActiveMQ.BrowseQueueController = ActiveMQ._module.controller("ActiveMQ.BrowseQueueController", ["$scope", "workspace", "jolokia", "localStorage", '$location', "activeMQMessage", "$timeout", function ($scope, workspace, jolokia, localStorage, location, activeMQMessage, $timeout) {
        $scope.searchText = '';
        $scope.allMessages = [];
        $scope.messages = [];
        $scope.headers = {};
        $scope.mode = 'text';
        $scope.deleteDialog = false;
        $scope.moveDialog = false;
        $scope.gridOptions = {
            selectedItems: [],
            data: 'messages',
            displayFooter: false,
            showFilter: false,
            showColumnMenu: true,
            enableColumnResize: true,
            enableColumnReordering: true,
            enableHighlighting: true,
            filterOptions: {
                filterText: '',
                useExternalFilter: true
            },
            selectWithCheckboxOnly: true,
            showSelectionCheckbox: true,
            maintainColumnRatios: false,
            columnDefs: [
                {
                    field: 'JMSMessageID',
                    displayName: 'Message ID',
                    cellTemplate: '<div class="ngCellText"><a ng-click="openMessageDialog(row)">{{row.entity.JMSMessageID}}</a></div>',
                    // for ng-grid
                    width: '34%'
                },
                {
                    field: 'JMSType',
                    displayName: 'Type',
                    width: '10%'
                },
                {
                    field: 'JMSPriority',
                    displayName: 'Priority',
                    width: '7%'
                },
                {
                    field: 'JMSTimestamp',
                    displayName: 'Timestamp',
                    width: '19%'
                },
                {
                    field: 'JMSExpiration',
                    displayName: 'Expires',
                    width: '10%'
                },
                {
                    field: 'JMSReplyTo',
                    displayName: 'Reply To',
                    width: '10%'
                },
                {
                    field: 'JMSCorrelationID',
                    displayName: 'Correlation ID',
                    width: '10%'
                }
            ]
        };
        $scope.showMessageDetails = false;
        var ignoreColumns = ["PropertiesText", "BodyPreview", "Text"];
        var flattenColumns = ["BooleanProperties", "ByteProperties", "ShortProperties", "IntProperties", "LongProperties", "FloatProperties", "DoubleProperties", "StringProperties"];
        $scope.$watch('workspace.selection', function () {
            if (workspace.moveIfViewInvalid()) {
                return;
            }
            // lets defer execution as we may not have the selection just yet
            setTimeout(loadTable, 50);
        });
        $scope.$watch('gridOptions.filterOptions.filterText', function (filterText) {
            filterMessages(filterText);
        });
        $scope.openMessageDialog = function (message) {
            ActiveMQ.selectCurrentMessage(message, "JMSMessageID", $scope);
            if ($scope.row) {
                $scope.mode = CodeEditor.detectTextFormat($scope.row.Text);
                $scope.showMessageDetails = true;
            }
        };
        $scope.refresh = loadTable;
        ActiveMQ.decorate($scope);
        $scope.moveMessages = function () {
            var selection = workspace.selection;
            var mbean = selection.objectName;
            if (mbean && selection) {
                var selectedItems = $scope.gridOptions.selectedItems;
                $scope.message = "Moved " + Core.maybePlural(selectedItems.length, "message" + " to " + $scope.queueName);
                var operation = "moveMessageTo(java.lang.String, java.lang.String)";
                angular.forEach(selectedItems, function (item, idx) {
                    var id = item.JMSMessageID;
                    if (id) {
                        var callback = (idx + 1 < selectedItems.length) ? intermediateResult : moveSuccess;
                        jolokia.execute(mbean, operation, id, $scope.queueName, Core.onSuccess(callback));
                    }
                });
            }
        };
        $scope.resendMessage = function () {
            var selection = workspace.selection;
            var mbean = selection.objectName;
            if (mbean && selection) {
                var selectedItems = $scope.gridOptions.selectedItems;
                //always assume a single message
                activeMQMessage.message = selectedItems[0];
                location.path('activemq/sendMessage');
            }
        };
        $scope.deleteMessages = function () {
            var selection = workspace.selection;
            var mbean = selection.objectName;
            if (mbean && selection) {
                var selectedItems = $scope.gridOptions.selectedItems;
                $scope.message = "Deleted " + Core.maybePlural(selectedItems.length, "message");
                var operation = "removeMessage(java.lang.String)";
                angular.forEach(selectedItems, function (item, idx) {
                    var id = item.JMSMessageID;
                    if (id) {
                        var callback = (idx + 1 < selectedItems.length) ? intermediateResult : operationSuccess;
                        jolokia.execute(mbean, operation, id, Core.onSuccess(callback));
                    }
                });
            }
        };
        $scope.retryMessages = function () {
            var selection = workspace.selection;
            var mbean = selection.objectName;
            if (mbean && selection) {
                var selectedItems = $scope.gridOptions.selectedItems;
                $scope.message = "Retry " + Core.maybePlural(selectedItems.length, "message");
                var operation = "retryMessage(java.lang.String)";
                angular.forEach(selectedItems, function (item, idx) {
                    var id = item.JMSMessageID;
                    if (id) {
                        var callback = (idx + 1 < selectedItems.length) ? intermediateResult : operationSuccess;
                        jolokia.execute(mbean, operation, id, Core.onSuccess(callback));
                    }
                });
            }
        };
        $scope.queueNames = function (completionText) {
            var queuesFolder = ActiveMQ.getSelectionQueuesFolder(workspace);
            return (queuesFolder) ? queuesFolder.children.map(function (n) { return n.title; }) : [];
        };
        function populateTable(response) {
            var data = response.value;
            if (!angular.isArray(data)) {
                $scope.allMessages = [];
                angular.forEach(data, function (value, idx) {
                    $scope.allMessages.push(value);
                });
            }
            else {
                $scope.allMessages = data;
            }
            angular.forEach($scope.allMessages, function (message) {
                message.headerHtml = createHeaderHtml(message);
                message.bodyText = createBodyText(message);
            });
            Core.$apply($scope);
            filterMessages($scope.gridOptions.filterOptions.filterText);
        }
        /*
         * For some reason using ng-repeat in the modal dialog doesn't work so lets
         * just create the HTML in code :)
         */
        function createBodyText(message) {
            if (message.Text) {
                var body = message.Text;
                var lenTxt = "" + body.length;
                message.textMode = "text (" + lenTxt + " chars)";
                return body;
            }
            else if (message.BodyPreview) {
                var code = Core.parseIntValue(localStorage["activemqBrowseBytesMessages"] || "1", "browse bytes messages");
                var body;
                message.textMode = "bytes (turned off)";
                if (code != 99) {
                    var bytesArr = [];
                    var textArr = [];
                    message.BodyPreview.forEach(function (b) {
                        if (code === 1 || code === 2) {
                            // text
                            textArr.push(String.fromCharCode(b));
                        }
                        if (code === 1 || code === 4) {
                            // hex and must be 2 digit so they space out evenly
                            var s = b.toString(16);
                            if (s.length === 1) {
                                s = "0" + s;
                            }
                            bytesArr.push(s);
                        }
                        else {
                            // just show as is without spacing out, as that is usually more used for hex than decimal
                            var s = b.toString(10);
                            bytesArr.push(s);
                        }
                    });
                    var bytesData = bytesArr.join(" ");
                    var textData = textArr.join("");
                    if (code === 1 || code === 2) {
                        // bytes and text
                        var len = message.BodyPreview.length;
                        var lenTxt = "" + textArr.length;
                        body = "bytes:\n" + bytesData + "\n\ntext:\n" + textData;
                        message.textMode = "bytes (" + len + " bytes) and text (" + lenTxt + " chars)";
                    }
                    else {
                        // bytes only
                        var len = message.BodyPreview.length;
                        body = bytesData;
                        message.textMode = "bytes (" + len + " bytes)";
                    }
                }
                return body;
            }
            else {
                message.textMode = "unsupported";
                return "Unsupported message body type which cannot be displayed by hawtio";
            }
        }
        /*
         * For some reason using ng-repeat in the modal dialog doesn't work so lets
         * just create the HTML in code :)
         */
        function createHeaderHtml(message) {
            var headers = createHeaders(message);
            var properties = createProperties(message);
            var headerKeys = Object.extended(headers).keys();
            function sort(a, b) {
                if (a > b)
                    return 1;
                if (a < b)
                    return -1;
                return 0;
            }
            var propertiesKeys = Object.extended(properties).keys().sort(sort);
            var jmsHeaders = headerKeys.filter(function (key) {
                return key.startsWith("JMS");
            }).sort(sort);
            var remaining = headerKeys.subtract(jmsHeaders, propertiesKeys).sort(sort);
            var buffer = [];
            function appendHeader(key) {
                var value = headers[key];
                if (value === null) {
                    value = '';
                }
                buffer.push('<tr><td class="propertyName"><span class="green">Header</span> - ' + key + '</td><td class="property-value">' + value + '</td></tr>');
            }
            function appendProperty(key) {
                var value = properties[key];
                if (value === null) {
                    value = '';
                }
                buffer.push('<tr><td class="propertyName">' + key + '</td><td class="property-value">' + value + '</td></tr>');
            }
            jmsHeaders.forEach(appendHeader);
            remaining.forEach(appendHeader);
            propertiesKeys.forEach(appendProperty);
            return buffer.join("\n");
        }
        function createHeaders(row) {
            ActiveMQ.log.debug("headers: ", row);
            var answer = {};
            angular.forEach(row, function (value, key) {
                if (!ignoreColumns.any(key) && !flattenColumns.any(key)) {
                    answer[Core.escapeHtml(key)] = Core.escapeHtml(value);
                }
            });
            return answer;
        }
        function createProperties(row) {
            ActiveMQ.log.debug("properties: ", row);
            var answer = {};
            angular.forEach(row, function (value, key) {
                if (!ignoreColumns.any(key) && flattenColumns.any(key)) {
                    angular.forEach(value, function (v2, k2) {
                        answer['<span class="green">' + key.replace('Properties', ' Property') + '</span> - ' + Core.escapeHtml(k2)] = Core.escapeHtml(v2);
                    });
                }
            });
            return answer;
        }
        function loadTable() {
            var objName;
            if (workspace.selection) {
                objName = workspace.selection.objectName;
            }
            else {
                // in case of refresh
                var key = location.search()['nid'];
                var node = workspace.keyToNodeMap[key];
                objName = node.objectName;
            }
            if (objName) {
                $scope.dlq = false;
                jolokia.getAttribute(objName, "DLQ", Core.onSuccess(onDlq, { silent: true }));
                jolokia.request({ type: 'exec', mbean: objName, operation: 'browse()' }, Core.onSuccess(populateTable));
            }
        }
        function onDlq(response) {
            $scope.dlq = response;
            Core.$apply($scope);
        }
        function intermediateResult() {
        }
        function operationSuccess() {
            $scope.messageDialog = false;
            $scope.gridOptions.selectedItems.splice(0);
            Core.notification("success", $scope.message);
            setTimeout(loadTable, 50);
        }
        function moveSuccess() {
            operationSuccess();
            workspace.loadTree();
        }
        function filterMessages(filter) {
            var searchConditions = buildSearchConditions(filter);
            evalFilter(searchConditions);
        }
        function evalFilter(searchConditions) {
            if (!searchConditions || searchConditions.length === 0) {
                $scope.messages = $scope.allMessages;
            }
            else {
                ActiveMQ.log.debug("Filtering conditions:", searchConditions);
                $scope.messages = $scope.allMessages.filter(function (message) {
                    ActiveMQ.log.debug("Message:", message);
                    var matched = true;
                    $.each(searchConditions, function (index, condition) {
                        if (!condition.column) {
                            matched = matched && evalMessage(message, condition.regex);
                        }
                        else {
                            matched = matched && (message[condition.column] && condition.regex.test(message[condition.column])) || (message.StringProperties && message.StringProperties[condition.column] && condition.regex.test(message.StringProperties[condition.column]));
                        }
                    });
                    return matched;
                });
            }
        }
        function evalMessage(message, regex) {
            var jmsHeaders = ['JMSDestination', 'JMSDeliveryMode', 'JMSExpiration', 'JMSPriority', 'JMSMessageID', 'JMSTimestamp', 'JMSCorrelationID', 'JMSReplyTo', 'JMSType', 'JMSRedelivered'];
            for (var i = 0; i < jmsHeaders.length; i++) {
                var header = jmsHeaders[i];
                if (message[header] && regex.test(message[header])) {
                    return true;
                }
            }
            if (message.StringProperties) {
                for (var property in message.StringProperties) {
                    if (regex.test(message.StringProperties[property])) {
                        return true;
                    }
                }
            }
            if (message.bodyText && regex.test(message.bodyText)) {
                return true;
            }
            return false;
        }
        function getRegExp(str, modifiers) {
            try {
                return new RegExp(str, modifiers);
            }
            catch (err) {
                return new RegExp(str.replace(/(\^|\$|\(|\)|<|>|\[|\]|\{|\}|\\|\||\.|\*|\+|\?)/g, '\\$1'));
            }
        }
        function buildSearchConditions(filterText) {
            var searchConditions = [];
            var qStr;
            if (!(qStr = $.trim(filterText))) {
                return;
            }
            var columnFilters = qStr.split(";");
            for (var i = 0; i < columnFilters.length; i++) {
                var args = columnFilters[i].split(':');
                if (args.length > 1) {
                    var columnName = $.trim(args[0]);
                    var columnValue = $.trim(args[1]);
                    if (columnName && columnValue) {
                        searchConditions.push({
                            column: columnName,
                            columnDisplay: columnName.replace(/\s+/g, '').toLowerCase(),
                            regex: getRegExp(columnValue, 'i')
                        });
                    }
                }
                else {
                    var val = $.trim(args[0]);
                    if (val) {
                        searchConditions.push({
                            column: '',
                            regex: getRegExp(val, 'i')
                        });
                    }
                }
            }
            return searchConditions;
        }
    }]);
})(ActiveMQ || (ActiveMQ = {}));

/// <reference path="../../includes.ts"/>
/// <reference path="activemqHelpers.ts"/>
var ActiveMQ;
(function (ActiveMQ) {
    ActiveMQ._module.controller("ActiveMQ.DestinationController", ["$scope", "workspace", "jolokia", function ($scope, workspace, jolokia) {
        $scope.workspace = workspace;
        $scope.message = "";
        $scope.queueType = 'true';
        $scope.deleteDialog = false;
        $scope.purgeDialog = false;
        updateQueueType();
        function updateQueueType() {
            $scope.destinationTypeName = $scope.queueType ? "Queue" : "Topic";
        }
        $scope.$watch('queueType', function () {
            updateQueueType();
        });
        $scope.$watch('workspace.selection', function () {
            workspace.moveIfViewInvalid();
        });
        function operationSuccess() {
            $scope.destinationName = "";
            $scope.workspace.operationCounter += 1;
            Core.$apply($scope);
            Core.notification("success", $scope.message);
            $scope.workspace.loadTree();
        }
        function deleteSuccess() {
            // lets set the selection to the parent
            workspace.removeAndSelectParentNode();
            $scope.workspace.operationCounter += 1;
            Core.$apply($scope);
            Core.notification("success", $scope.message);
            $scope.workspace.loadTree();
        }
        function getBrokerMBean(jolokia) {
            var mbean = null;
            var selection = workspace.selection;
            if (selection && ActiveMQ.isBroker(workspace) && selection.objectName) {
                return selection.objectName;
            }
            var folderNames = selection.folderNames;
            //if (selection && jolokia && folderNames && folderNames.length > 1) {
            var parent = selection ? selection.parent : null;
            if (selection && parent && jolokia && folderNames && folderNames.length > 1) {
                mbean = parent.objectName;
                // we might be a destination, so lets try one more parent
                if (!mbean && parent) {
                    mbean = parent.parent.objectName;
                }
                if (!mbean) {
                    mbean = "" + folderNames[0] + ":BrokerName=" + folderNames[1] + ",Type=Broker";
                }
            }
            return mbean;
        }
        $scope.createDestination = function (name, isQueue) {
            var mbean = getBrokerMBean(jolokia);
            if (mbean) {
                var operation;
                if (isQueue) {
                    operation = "addQueue(java.lang.String)";
                    $scope.message = "Created queue " + name;
                }
                else {
                    operation = "addTopic(java.lang.String)";
                    $scope.message = "Created topic " + name;
                }
                if (mbean) {
                    jolokia.execute(mbean, operation, name, Core.onSuccess(operationSuccess));
                }
                else {
                    Core.notification("error", "Could not find the Broker MBean!");
                }
            }
        };
        $scope.deleteDestination = function () {
            var mbean = getBrokerMBean(jolokia);
            var selection = workspace.selection;
            var entries = selection.entries;
            if (mbean && selection && jolokia && entries) {
                var domain = selection.domain;
                var name = entries["Destination"] || entries["destinationName"] || selection.title;
                name = name.unescapeHTML();
                var isQueue = "Topic" !== (entries["Type"] || entries["destinationType"]);
                var operation;
                if (isQueue) {
                    operation = "removeQueue(java.lang.String)";
                    $scope.message = "Deleted queue " + name;
                }
                else {
                    operation = "removeTopic(java.lang.String)";
                    $scope.message = "Deleted topic " + name;
                }
                jolokia.execute(mbean, operation, name, Core.onSuccess(deleteSuccess));
            }
        };
        $scope.purgeDestination = function () {
            var mbean = workspace.getSelectedMBeanName();
            var selection = workspace.selection;
            var entries = selection.entries;
            if (mbean && selection && jolokia && entries) {
                var name = entries["Destination"] || entries["destinationName"] || selection.title;
                name = name.unescapeHTML();
                var operation = "purge()";
                $scope.message = "Purged queue " + name;
                jolokia.execute(mbean, operation, Core.onSuccess(operationSuccess));
            }
        };
        $scope.name = function () {
            var selection = workspace.selection;
            if (selection) {
                return selection.title;
            }
            return null;
        };
    }]);
})(ActiveMQ || (ActiveMQ = {}));

/// <reference path="../../includes.ts"/>
/// <reference path="activemqHelpers.ts"/>
var ActiveMQ;
(function (ActiveMQ) {
    ActiveMQ._module.controller("ActiveMQ.DurableSubscriberController", ["$scope", "workspace", "jolokia", function ($scope, workspace, jolokia) {
        $scope.refresh = loadTable;
        $scope.durableSubscribers = [];
        $scope.tempData = [];
        $scope.createSubscriberDialog = new UI.Dialog();
        $scope.deleteSubscriberDialog = new UI.Dialog();
        $scope.showSubscriberDialog = new UI.Dialog();
        $scope.topicName = '';
        $scope.clientId = '';
        $scope.subscriberName = '';
        $scope.subSelector = '';
        $scope.gridOptions = {
            selectedItems: [],
            data: 'durableSubscribers',
            displayFooter: false,
            showFilter: false,
            showColumnMenu: true,
            enableCellSelection: false,
            enableColumnResize: true,
            enableColumnReordering: true,
            selectWithCheckboxOnly: false,
            showSelectionCheckbox: false,
            multiSelect: false,
            displaySelectionCheckbox: false,
            filterOptions: {
                filterText: ''
            },
            maintainColumnRatios: false,
            columnDefs: [
                {
                    field: 'destinationName',
                    displayName: 'Topic',
                    width: '30%'
                },
                {
                    field: 'clientId',
                    displayName: 'Client ID',
                    width: '30%'
                },
                {
                    field: 'consumerId',
                    displayName: 'Consumer ID',
                    cellTemplate: '<div class="ngCellText"><span ng-hide="row.entity.status != \'Offline\'">{{row.entity.consumerId}}</span><a ng-show="row.entity.status != \'Offline\'" ng-click="openSubscriberDialog(row)">{{row.entity.consumerId}}</a></div>',
                    width: '30%'
                },
                {
                    field: 'status',
                    displayName: 'Status',
                    width: '10%'
                }
            ]
        };
        $scope.doCreateSubscriber = function (clientId, subscriberName, topicName, subSelector) {
            $scope.createSubscriberDialog.close();
            $scope.clientId = clientId;
            $scope.subscriberName = subscriberName;
            $scope.topicName = topicName;
            $scope.subSelector = subSelector;
            if (Core.isBlank($scope.subSelector)) {
                $scope.subSelector = null;
            }
            var mbean = getBrokerMBean(jolokia);
            if (mbean) {
                jolokia.execute(mbean, "createDurableSubscriber(java.lang.String, java.lang.String, java.lang.String, java.lang.String)", $scope.clientId, $scope.subscriberName, $scope.topicName, $scope.subSelector, Core.onSuccess(function () {
                    Core.notification('success', "Created durable subscriber " + clientId);
                    $scope.clientId = '';
                    $scope.subscriberName = '';
                    $scope.topicName = '';
                    $scope.subSelector = '';
                    loadTable();
                }));
            }
            else {
                Core.notification("error", "Could not find the Broker MBean!");
            }
        };
        $scope.deleteSubscribers = function () {
            var mbean = $scope.gridOptions.selectedItems[0]._id;
            jolokia.execute(mbean, "destroy()", Core.onSuccess(function () {
                $scope.showSubscriberDialog.close();
                Core.notification('success', "Deleted durable subscriber");
                loadTable();
                $scope.gridOptions.selectedItems = [];
            }));
        };
        $scope.openSubscriberDialog = function (subscriber) {
            jolokia.request({ type: "read", mbean: subscriber.entity._id }, Core.onSuccess(function (response) {
                $scope.showSubscriberDialog.subscriber = response.value;
                $scope.showSubscriberDialog.subscriber.Status = subscriber.entity.status;
                console.log("Subscriber is now " + $scope.showSubscriberDialog.subscriber);
                Core.$apply($scope);
                // now lets start opening the dialog
                setTimeout(function () {
                    $scope.showSubscriberDialog.open();
                    Core.$apply($scope);
                }, 100);
            }));
        };
        $scope.topicNames = function (completionText) {
            var topicsFolder = ActiveMQ.getSelectionTopicsFolder(workspace);
            return (topicsFolder) ? topicsFolder.children.map(function (n) { return n.title; }) : [];
        };
        $scope.$watch('workspace.selection', function () {
            if (workspace.moveIfViewInvalid())
                return;
            // lets defer execution as we may not have the selection just yet
            setTimeout(loadTable, 50);
        });
        function loadTable() {
            var mbean = getBrokerMBean(jolokia);
            if (mbean) {
                $scope.durableSubscribers = [];
                jolokia.request({ type: "read", mbean: mbean, attribute: ["DurableTopicSubscribers"] }, Core.onSuccess(function (response) { return populateTable(response, "DurableTopicSubscribers", "Active"); }));
                jolokia.request({ type: "read", mbean: mbean, attribute: ["InactiveDurableTopicSubscribers"] }, Core.onSuccess(function (response) { return populateTable(response, "InactiveDurableTopicSubscribers", "Offline"); }));
            }
        }
        function populateTable(response, attr, status) {
            var data = response.value;
            ActiveMQ.log.debug("Got data: ", data);
            $scope.durableSubscribers.push.apply($scope.durableSubscribers, data[attr].map(function (o) {
                var objectName = o["objectName"];
                var entries = Core.objectNameProperties(objectName);
                if (!('objectName' in o)) {
                    if ('canonicalName' in o) {
                        objectName = o['canonicalName'];
                    }
                    entries = Object.extended(o['keyPropertyList']).clone();
                }
                entries["_id"] = objectName;
                entries["status"] = status;
                return entries;
            }));
            Core.$apply($scope);
        }
        function getBrokerMBean(jolokia) {
            var mbean = null;
            var selection = workspace.selection;
            if (selection && ActiveMQ.isBroker(workspace) && selection.objectName) {
                return selection.objectName;
            }
            var folderNames = selection.folderNames;
            //if (selection && jolokia && folderNames && folderNames.length > 1) {
            var parent = selection ? selection.parent : null;
            if (selection && parent && jolokia && folderNames && folderNames.length > 1) {
                mbean = parent.objectName;
                // we might be a destination, so lets try one more parent
                if (!mbean && parent) {
                    mbean = parent.parent.objectName;
                }
                if (!mbean) {
                    mbean = "" + folderNames[0] + ":BrokerName=" + folderNames[1] + ",Type=Broker";
                }
            }
            return mbean;
        }
    }]);
})(ActiveMQ || (ActiveMQ = {}));

/// <reference path="../../includes.ts"/>
/// <reference path="activemqHelpers.ts"/>
var ActiveMQ;
(function (ActiveMQ) {
    ActiveMQ._module.controller("ActiveMQ.JobSchedulerController", ["$scope", "workspace", "jolokia", function ($scope, workspace, jolokia) {
        $scope.refresh = loadTable;
        $scope.jobs = [];
        $scope.deleteJobsDialog = new UI.Dialog();
        $scope.gridOptions = {
            selectedItems: [],
            data: 'jobs',
            displayFooter: false,
            showFilter: false,
            showColumnMenu: true,
            enableColumnResize: true,
            enableColumnReordering: true,
            filterOptions: {
                filterText: ''
            },
            selectWithCheckboxOnly: true,
            showSelectionCheckbox: true,
            maintainColumnRatios: false,
            columnDefs: [
                {
                    field: 'jobId',
                    displayName: 'Job ID',
                    width: '25%'
                },
                {
                    field: 'cronEntry',
                    displayName: 'Cron Entry',
                    width: '10%'
                },
                {
                    field: 'delay',
                    displayName: 'Delay',
                    width: '5%'
                },
                {
                    field: 'repeat',
                    displayName: 'repeat',
                    width: '5%'
                },
                {
                    field: 'period',
                    displayName: 'period',
                    width: '5%'
                },
                {
                    field: 'start',
                    displayName: 'Start',
                    width: '25%'
                },
                {
                    field: 'next',
                    displayName: 'Next',
                    width: '25%'
                }
            ]
        };
        $scope.$watch('workspace.selection', function () {
            if (workspace.moveIfViewInvalid())
                return;
            // lets defer execution as we may not have the selection just yet
            setTimeout(loadTable, 50);
        });
        function loadTable() {
            var selection = workspace.selection;
            if (selection) {
                var mbean = selection.objectName;
                if (mbean) {
                    jolokia.request({ type: 'read', mbean: mbean, attribute: "AllJobs" }, Core.onSuccess(populateTable));
                }
            }
            Core.$apply($scope);
        }
        function populateTable(response) {
            var data = response.value;
            if (!angular.isArray(data)) {
                $scope.jobs = [];
                angular.forEach(data, function (value, idx) {
                    $scope.jobs.push(value);
                });
            }
            else {
                $scope.jobs = data;
            }
            Core.$apply($scope);
        }
        $scope.deleteJobs = function () {
            var selection = workspace.selection;
            var mbean = selection.objectName;
            if (mbean && selection) {
                var selectedItems = $scope.gridOptions.selectedItems;
                $scope.message = "Deleted " + Core.maybePlural(selectedItems.length, "job");
                var operation = "removeJob(java.lang.String)";
                angular.forEach(selectedItems, function (item, idx) {
                    var id = item.jobId;
                    if (id) {
                        var callback = (idx + 1 < selectedItems.length) ? intermediateResult : operationSuccess;
                        jolokia.execute(mbean, operation, id, Core.onSuccess(callback));
                    }
                });
            }
        };
        function intermediateResult() {
        }
        function operationSuccess() {
            $scope.gridOptions.selectedItems.splice(0);
            Core.notification("success", $scope.message);
            setTimeout(loadTable, 50);
        }
    }]);
})(ActiveMQ || (ActiveMQ = {}));

/// <reference path="../../includes.ts"/>
/// <reference path="activemqHelpers.ts"/>
/**
 * @module ActiveMQ
 */
var ActiveMQ;
(function (ActiveMQ) {
    ActiveMQ._module.controller("ActiveMQ.PreferencesController", ["$scope", "localStorage", "userDetails", "$rootScope", function ($scope, localStorage, userDetails, $rootScope) {
        Core.initPreferenceScope($scope, localStorage, {
            'activemqUserName': {
                'value': userDetails.username,
            },
            'activemqPassword': {
                'value': userDetails.password
            },
            'activemqBrowseBytesMessages': {
                'value': 1,
                'converter': parseInt,
                'formatter': function (value) {
                    return "" + value;
                }
            },
            'activemqFilterAdvisoryTopics': {
                'value': false,
                'converter': Core.parseBooleanValue,
                'post': function (newValue) {
                    $rootScope.$broadcast('jmxTreeUpdated');
                }
            }
        });
    }]);
})(ActiveMQ || (ActiveMQ = {}));

/// <reference path="../../includes.ts"/>
/// <reference path="activemqHelpers.ts"/>
var ActiveMQ;
(function (ActiveMQ) {
    ActiveMQ._module.controller("ActiveMQ.TreeHeaderController", ["$scope", function ($scope) {
        $scope.expandAll = function () {
            Tree.expandAll("#activemqtree");
        };
        $scope.contractAll = function () {
            Tree.contractAll("#activemqtree");
        };
    }]);
    ActiveMQ._module.controller("ActiveMQ.TreeController", ["$scope", "$location", "workspace", "localStorage", function ($scope, $location, workspace, localStorage) {
        $scope.$on("$routeChangeSuccess", function (event, current, previous) {
            // lets do this asynchronously to avoid Error: $digest already in progress
            setTimeout(updateSelectionFromURL, 50);
        });
        $scope.$watch('workspace.tree', function () {
            reloadTree();
        });
        $scope.$on('jmxTreeUpdated', function () {
            reloadTree();
        });
        function reloadTree() {
            ActiveMQ.log.debug("workspace tree has changed, lets reload the activemq tree");
            var children = [];
            var tree = workspace.tree;
            if (tree) {
                var domainName = "org.apache.activemq";
                var folder = tree.get(domainName);
                if (folder) {
                    children = folder.children;
                }
                if (children.length) {
                    var firstChild = children[0];
                    // the children could be AMQ 5.7 style broker name folder with the actual MBean in the children
                    // along with folders for the Queues etc...
                    if (!firstChild.typeName && firstChild.children.length < 4) {
                        // lets avoid the top level folder
                        var answer = [];
                        angular.forEach(children, function (child) {
                            answer = answer.concat(child.children);
                        });
                        children = answer;
                    }
                }
                // filter out advisory topics
                children.forEach(function (broker) {
                    var grandChildren = broker.children;
                    if (grandChildren) {
                        Tree.sanitize(grandChildren);
                        var idx = grandChildren.findIndex(function (n) { return n.title === "Topic"; });
                        if (idx > 0) {
                            var old = grandChildren[idx];
                            // we need to store all topics the first time on the workspace
                            // so we have access to them later if the user changes the filter in the preferences
                            var key = "ActiveMQ-allTopics-" + broker.title;
                            var allTopics = old.children.clone();
                            workspace.mapData[key] = allTopics;
                            var filter = Core.parseBooleanValue(localStorage["activemqFilterAdvisoryTopics"]);
                            if (filter) {
                                if (old && old.children) {
                                    var filteredTopics = old.children.filter(function (c) { return !c.title.startsWith("ActiveMQ.Advisory"); });
                                    old.children = filteredTopics;
                                }
                            }
                            else if (allTopics) {
                                old.children = allTopics;
                            }
                        }
                    }
                });
                var treeElement = $("#activemqtree");
                Jmx.enableTree($scope, $location, workspace, treeElement, children, true);
                // lets do this asynchronously to avoid Error: $digest already in progress
                setTimeout(updateSelectionFromURL, 50);
            }
        }
        function updateSelectionFromURL() {
            Jmx.updateTreeSelectionFromURLAndAutoSelect($location, $("#activemqtree"), function (first) {
                // use function to auto select the queue folder on the 1st broker
                var queues = first.getChildren()[0];
                if (queues && queues.data.title === 'Queue') {
                    first = queues;
                    first.expand(true);
                    return first;
                }
                return null;
            }, true);
        }
    }]);
})(ActiveMQ || (ActiveMQ = {}));

/// <reference path="../../includes.ts"/>
/**
 * @module Dozer
 * @main Dozer
 */
var Dozer;
(function (Dozer) {
    /**
     * The JMX domain for Dozer
     * @property jmxDomain
     * @for Dozer
     * @type String
     */
    Dozer.jmxDomain = 'net.sourceforge.dozer';
    Dozer.introspectorMBean = "hawtio:type=Introspector";
    /**
     * Don't try and load properties for these types
     * @property excludedPackages
     * @for Dozer
     * @type {Array}
     */
    Dozer.excludedPackages = [
        'java.lang',
        'int',
        'double',
        'long'
    ];
    /**
     * Lets map the class names to element names
     * @property elementNameMappings
     * @for Dozer
     * @type {Array}
     */
    Dozer.elementNameMappings = {
        "Mapping": "mapping",
        "MappingClass": "class",
        "Field": "field"
    };
    Dozer.log = Logger.get("Dozer");
    /**
     * Converts the XML string or DOM node to a Dozer model
     * @method loadDozerModel
     * @for Dozer
     * @static
     * @param {Object} xml
     * @param {String} pageId
     * @return {Mappings}
     */
    function loadDozerModel(xml, pageId) {
        var doc = xml;
        if (angular.isString(xml)) {
            doc = $.parseXML(xml);
        }
        console.log("Has Dozer XML document: " + doc);
        var model = new Dozer.Mappings(doc);
        var mappingsElement = doc.documentElement;
        copyAttributes(model, mappingsElement);
        $(mappingsElement).children("mapping").each(function (idx, element) {
            var mapping = createMapping(element);
            model.mappings.push(mapping);
        });
        return model;
    }
    Dozer.loadDozerModel = loadDozerModel;
    function saveToXmlText(model) {
        // lets copy the original doc then replace the mapping elements
        var element = model.doc.documentElement.cloneNode(false);
        appendElement(model.mappings, element, null, 1);
        Dozer.addTextNode(element, "\n");
        var xmlText = Core.xmlNodeToString(element);
        return '<?xml version="1.0" encoding="UTF-8"?>\n' + xmlText;
    }
    Dozer.saveToXmlText = saveToXmlText;
    function findUnmappedFields(workspace, mapping, fn) {
        // lets find the fields which are unmapped
        var className = mapping.class_a.value;
        findProperties(workspace, className, null, function (properties) {
            var answer = [];
            angular.forEach(properties, function (property) {
                console.log("got property " + JSON.stringify(property, null, "  "));
                var name = property.name;
                if (name) {
                    if (mapping.hasFromField(name)) {
                    }
                    else {
                        // TODO auto-detect this property name in the to classes?
                        answer.push(new Dozer.UnmappedField(name, property));
                    }
                }
            });
            fn(answer);
        });
    }
    Dozer.findUnmappedFields = findUnmappedFields;
    /**
     * Finds the properties on the given class and returns them; and either invokes the given function
     * or does a sync request and returns them
     * @method findProperties
     * @for Dozer
     * @static
     * @param {Core.Workspace} workspace
     * @param {String} className
     * @param {String} filter
     * @param {Function} fn
     * @return {any}
     */
    function findProperties(workspace, className, filter, fn) {
        if (filter === void 0) { filter = null; }
        if (fn === void 0) { fn = null; }
        var mbean = getIntrospectorMBean(workspace);
        if (mbean) {
            if (filter) {
                return workspace.jolokia.execute(mbean, "findProperties", className, filter, onSuccess(fn));
            }
            else {
                return workspace.jolokia.execute(mbean, "getProperties", className, onSuccess(fn));
            }
        }
        else {
            if (fn) {
                return fn([]);
            }
            else {
                return [];
            }
        }
    }
    Dozer.findProperties = findProperties;
    /**
     * Finds class names matching the given search text and either invokes the function with the results
     * or does a sync request and returns them.
     * @method findClassNames
     * @for Dozer
     * @static
     * @param {Core.Workspace} workspace
     * @param {String} searchText
     * @param {Number} limit @default 20
     * @param {Function} fn
     * @return {any}
     */
    function findClassNames(workspace, searchText, limit, fn) {
        if (limit === void 0) { limit = 20; }
        if (fn === void 0) { fn = null; }
        var mbean = getIntrospectorMBean(workspace);
        if (mbean) {
            return workspace.jolokia.execute(mbean, "findClassNames", searchText, limit, onSuccess(fn));
        }
        else {
            if (fn) {
                return fn([]);
            }
            else {
                return [];
            }
        }
    }
    Dozer.findClassNames = findClassNames;
    function getIntrospectorMBean(workspace) {
        // lets hard code this so its easy to use in any JVM
        return Dozer.introspectorMBean;
        // return Core.getMBeanTypeObjectName(workspace, "hawtio", "Introspector");
    }
    Dozer.getIntrospectorMBean = getIntrospectorMBean;
    function loadModelFromTree(rootTreeNode, oldModel) {
        oldModel.mappings = [];
        angular.forEach(rootTreeNode.childList, function (treeNode) {
            var mapping = Core.pathGet(treeNode, ["data", "entity"]);
            if (mapping) {
                oldModel.mappings.push(mapping);
            }
        });
        return oldModel;
    }
    Dozer.loadModelFromTree = loadModelFromTree;
    function createDozerTree(model) {
        var id = "mappings";
        var folder = new Folder(id);
        folder.addClass = "net-sourceforge-dozer-mappings";
        folder.domain = Dozer.jmxDomain;
        folder.typeName = "mappings";
        folder.entity = model;
        folder.key = Core.toSafeDomID(id);
        angular.forEach(model.mappings, function (mapping) {
            var mappingFolder = createMappingFolder(mapping, folder);
            folder.children.push(mappingFolder);
        });
        return folder;
    }
    Dozer.createDozerTree = createDozerTree;
    function createMappingFolder(mapping, parentFolder) {
        var mappingName = mapping.name();
        var mappingFolder = new Folder(mappingName);
        mappingFolder.addClass = "net-sourceforge-dozer-mapping";
        mappingFolder.typeName = "mapping";
        mappingFolder.domain = Dozer.jmxDomain;
        mappingFolder.key = (parentFolder ? parentFolder.key + "_" : "") + Core.toSafeDomID(mappingName);
        mappingFolder.parent = parentFolder;
        mappingFolder.entity = mapping;
        mappingFolder.icon = Core.url("/app/dozer/img/class.gif");
        /*
              mappingFolder.tooltip = nodeSettings["tooltip"] || nodeSettings["description"] || id;
              */
        angular.forEach(mapping.fields, function (field) {
            addMappingFieldFolder(field, mappingFolder);
        });
        return mappingFolder;
    }
    Dozer.createMappingFolder = createMappingFolder;
    function addMappingFieldFolder(field, mappingFolder) {
        var name = field.name();
        var fieldFolder = new Folder(name);
        fieldFolder.addClass = "net-sourceforge-dozer-field";
        fieldFolder.typeName = "field";
        fieldFolder.domain = Dozer.jmxDomain;
        fieldFolder.key = mappingFolder.key + "_" + Core.toSafeDomID(name);
        fieldFolder.parent = mappingFolder;
        fieldFolder.entity = field;
        fieldFolder.icon = Core.url("/app/dozer/img/attribute.gif");
        /*
              fieldFolder.tooltip = nodeSettings["tooltip"] || nodeSettings["description"] || id;
              */
        mappingFolder.children.push(fieldFolder);
        return fieldFolder;
    }
    Dozer.addMappingFieldFolder = addMappingFieldFolder;
    function createMapping(element) {
        var mapping = new Dozer.Mapping();
        var elementJQ = $(element);
        mapping.class_a = createMappingClass(elementJQ.children("class-a"));
        mapping.class_b = createMappingClass(elementJQ.children("class-b"));
        elementJQ.children("field").each(function (idx, fieldElement) {
            var field = createField(fieldElement);
            mapping.fields.push(field);
        });
        copyAttributes(mapping, element);
        return mapping;
    }
    function createField(element) {
        if (element) {
            var jqe = $(element);
            var a = jqe.children("a").text();
            var b = jqe.children("b").text();
            var field = new Dozer.Field(new Dozer.FieldDefinition(a), new Dozer.FieldDefinition(b));
            copyAttributes(field, element);
            return field;
        }
        return new Dozer.Field(new Dozer.FieldDefinition(""), new Dozer.FieldDefinition(""));
    }
    function createMappingClass(jqElement) {
        if (jqElement && jqElement[0]) {
            var element = jqElement[0];
            var text = element.textContent;
            if (text) {
                var mappingClass = new Dozer.MappingClass(text);
                copyAttributes(mappingClass, element);
                return mappingClass;
            }
        }
        // lets create a default empty mapping
        return new Dozer.MappingClass("");
    }
    function copyAttributes(object, element) {
        var attributeMap = element.attributes;
        for (var i = 0; i < attributeMap.length; i++) {
            // TODO hacky work around for compiler issue ;)
            //var attr = attributeMap.item(i);
            var attMap = attributeMap;
            var attr = attMap.item(i);
            if (attr) {
                var name = attr.localName;
                var value = attr.value;
                if (name && !name.startsWith("xmlns")) {
                    var safeName = Forms.safeIdentifier(name);
                    object[safeName] = value;
                }
            }
        }
    }
    function appendAttributes(object, element, ignorePropertyNames) {
        angular.forEach(object, function (value, key) {
            if (ignorePropertyNames.any(key)) {
            }
            else {
                // lets add an attribute value
                if (value) {
                    var text = value.toString();
                    // lets replace any underscores with dashes
                    var name = key.replace(/_/g, '-');
                    element.setAttribute(name, text);
                }
            }
        });
    }
    Dozer.appendAttributes = appendAttributes;
    /**
     * Adds a new child element for this mapping to the given element
     * @method appendElement
     * @for Dozer
     * @static
     * @param {any} object
     * @param {any} element
     * @param {String} elementName
     * @param {Number} indentLevel
     * @return the last child element created
     */
    function appendElement(object, element, elementName, indentLevel) {
        if (elementName === void 0) { elementName = null; }
        if (indentLevel === void 0) { indentLevel = 0; }
        var answer = null;
        if (angular.isArray(object)) {
            angular.forEach(object, function (child) {
                answer = appendElement(child, element, elementName, indentLevel);
            });
        }
        else if (object) {
            if (!elementName) {
                var className = Core.pathGet(object, ["constructor", "name"]);
                if (!className) {
                    console.log("WARNING: no class name for value " + object);
                }
                else {
                    elementName = Dozer.elementNameMappings[className];
                    if (!elementName) {
                        console.log("WARNING: could not map class name " + className + " to an XML element name");
                    }
                }
            }
            if (elementName) {
                if (indentLevel) {
                    var text = indentText(indentLevel);
                    Dozer.addTextNode(element, text);
                }
                var doc = element.ownerDocument || document;
                var child = doc.createElement(elementName);
                // navigate child properties...
                var fn = object.saveToElement;
                if (fn) {
                    fn.apply(object, [child]);
                }
                else {
                    angular.forEach(object, function (value, key) {
                        console.log("has key " + key + " value " + value);
                    });
                }
                // if we have any element children then add newline text node
                if ($(child).children().length) {
                    //var text = indentText(indentLevel - 1);
                    var text = indentText(indentLevel);
                    Dozer.addTextNode(child, text);
                }
                element.appendChild(child);
                answer = child;
            }
        }
        return answer;
    }
    Dozer.appendElement = appendElement;
    function nameOf(object) {
        var text = angular.isObject(object) ? object["value"] : null;
        if (!text && angular.isString(object)) {
            text = object;
        }
        return text || "?";
    }
    Dozer.nameOf = nameOf;
    function addTextNode(element, text) {
        if (text) {
            var doc = element.ownerDocument || document;
            var child = doc.createTextNode(text);
            element.appendChild(child);
        }
    }
    Dozer.addTextNode = addTextNode;
    function indentText(indentLevel) {
        var text = "\n";
        for (var i = 0; i < indentLevel; i++) {
            text += "  ";
        }
        return text;
    }
})(Dozer || (Dozer = {}));

/// <reference path="../../includes.ts"/>
/**
 * @module Dozer
 */
var Dozer;
(function (Dozer) {
    /**
     * @class Mappings
     */
    var Mappings = (function () {
        function Mappings(doc, mappings) {
            if (mappings === void 0) { mappings = []; }
            this.doc = doc;
            this.mappings = mappings;
        }
        return Mappings;
    })();
    Dozer.Mappings = Mappings;
    /**
     * @class Mapping
     */
    var Mapping = (function () {
        function Mapping() {
            this.fields = [];
            this.map_id = Core.getUUID();
            this.class_a = new MappingClass('');
            this.class_b = new MappingClass('');
        }
        Mapping.prototype.name = function () {
            return Dozer.nameOf(this.class_a) + " -> " + Dozer.nameOf(this.class_b);
        };
        Mapping.prototype.hasFromField = function (name) {
            return this.fields.find(function (f) { return name === f.a.value; });
        };
        Mapping.prototype.hasToField = function (name) {
            return this.fields.find(function (f) { return name === f.b.value; });
        };
        Mapping.prototype.saveToElement = function (element) {
            Dozer.appendElement(this.class_a, element, "class-a", 2);
            Dozer.appendElement(this.class_b, element, "class-b", 2);
            Dozer.appendElement(this.fields, element, "field", 2);
            Dozer.appendAttributes(this, element, ["class_a", "class_b", "fields"]);
        };
        return Mapping;
    })();
    Dozer.Mapping = Mapping;
    /**
     * @class MappingClass
     */
    var MappingClass = (function () {
        function MappingClass(value) {
            this.value = value;
        }
        MappingClass.prototype.saveToElement = function (element) {
            Dozer.addTextNode(element, this.value);
            Dozer.appendAttributes(this, element, ["value", "properties", "error"]);
        };
        return MappingClass;
    })();
    Dozer.MappingClass = MappingClass;
    /**
     * @class Field
     */
    var Field = (function () {
        function Field(a, b) {
            this.a = a;
            this.b = b;
        }
        Field.prototype.name = function () {
            return Dozer.nameOf(this.a) + " -> " + Dozer.nameOf(this.b);
        };
        Field.prototype.saveToElement = function (element) {
            Dozer.appendElement(this.a, element, "a", 3);
            Dozer.appendElement(this.b, element, "b", 3);
            Dozer.appendAttributes(this, element, ["a", "b"]);
        };
        return Field;
    })();
    Dozer.Field = Field;
    /**
     * @class FieldDefinition
     */
    var FieldDefinition = (function () {
        function FieldDefinition(value) {
            this.value = value;
        }
        FieldDefinition.prototype.saveToElement = function (element) {
            Dozer.addTextNode(element, this.value);
            Dozer.appendAttributes(this, element, ["value", "properties", "error"]);
        };
        return FieldDefinition;
    })();
    Dozer.FieldDefinition = FieldDefinition;
    /**
     * @class UnmappedField
     */
    var UnmappedField = (function () {
        function UnmappedField(fromField, property, toField) {
            if (toField === void 0) { toField = null; }
            this.fromField = fromField;
            this.property = property;
            this.toField = toField;
        }
        return UnmappedField;
    })();
    Dozer.UnmappedField = UnmappedField;
})(Dozer || (Dozer = {}));

/// <reference path="../../includes.ts"/>
/**
 * @module Dozer
 */
var Dozer;
(function (Dozer) {
    /**
     * Configures the JSON schemas to improve the UI models
     * @method schemaConfigure
     * @for Dozer
     */
    function schemaConfigure() {
        io_hawt_dozer_schema_Field["tabs"] = {
            'Fields': ['a.value', 'b.value'],
            'From Field': ['a\\..*'],
            'To Field': ['b\\..*'],
            'Field Configuration': ['*']
        };
        io_hawt_dozer_schema_Mapping["tabs"] = {
            'Classes': ['class-a.value', 'class-b.value'],
            'From Class': ['class-a\\..*'],
            'To Class': ['class-b\\..*'],
            'Class Configuration': ['*']
        };
        // hide the fields table from the class configuration tab
        io_hawt_dozer_schema_Mapping.properties.fieldOrFieldExclude.hidden = true;
        Core.pathSet(io_hawt_dozer_schema_Field, ["properties", "a", "properties", "value", "label"], "From Field");
        Core.pathSet(io_hawt_dozer_schema_Field, ["properties", "b", "properties", "value", "label"], "To Field");
        Core.pathSet(io_hawt_dozer_schema_Mapping, ["properties", "class-a", "properties", "value", "label"], "From Class");
        Core.pathSet(io_hawt_dozer_schema_Mapping, ["properties", "class-b", "properties", "value", "label"], "To Class");
        // ignore prefixes in the generated labels
        Core.pathSet(io_hawt_dozer_schema_Field, ["properties", "a", "ignorePrefixInLabel"], true);
        Core.pathSet(io_hawt_dozer_schema_Field, ["properties", "b", "ignorePrefixInLabel"], true);
        Core.pathSet(io_hawt_dozer_schema_Mapping, ["properties", "class-a", "ignorePrefixInLabel"], true);
        Core.pathSet(io_hawt_dozer_schema_Mapping, ["properties", "class-b", "ignorePrefixInLabel"], true);
        // add custom widgets
        Core.pathSet(io_hawt_dozer_schema_Mapping, ["properties", "class-a", "properties", "value", "formTemplate"], classNameWidget("class_a"));
        Core.pathSet(io_hawt_dozer_schema_Mapping, ["properties", "class-b", "properties", "value", "formTemplate"], classNameWidget("class_b"));
        Core.pathSet(io_hawt_dozer_schema_Field, ["properties", "a", "properties", "value", "formTemplate"], '<input type="text" ng-model="dozerEntity.a.value" ' + 'typeahead="title for title in fromFieldNames($viewValue) | filter:$viewValue" ' + 'typeahead-editable="true"  title="The Java class name"/>');
        Core.pathSet(io_hawt_dozer_schema_Field, ["properties", "b", "properties", "value", "formTemplate"], '<input type="text" ng-model="dozerEntity.b.value" ' + 'typeahead="title for title in toFieldNames($viewValue) | filter:$viewValue" ' + 'typeahead-editable="true"  title="The Java class name"/>');
        function classNameWidget(propertyName) {
            return '<input type="text" ng-model="dozerEntity.' + propertyName + '.value" ' + 'typeahead="title for title in classNames($viewValue) | filter:$viewValue" ' + 'typeahead-editable="true"  title="The Java class name"/>';
        }
    }
    Dozer.schemaConfigure = schemaConfigure;
})(Dozer || (Dozer = {}));

/// <reference path="../../includes.ts"/>
/**
 * @module Karaf
 */
var Karaf;
(function (Karaf) {
    Karaf.log = Logger.get("Karaf");
    function setSelect(selection, group) {
        if (!angular.isDefined(selection)) {
            return group[0];
        }
        var answer = group.findIndex(function (item) {
            return item.id === selection.id;
        });
        if (answer !== -1) {
            return group[answer];
        }
        else {
            return group[0];
        }
    }
    Karaf.setSelect = setSelect;
    function installRepository(workspace, jolokia, uri, success, error) {
        Karaf.log.info("installing URI: ", uri);
        jolokia.request({
            type: 'exec',
            mbean: getSelectionFeaturesMBean(workspace),
            operation: 'addRepository(java.lang.String)',
            arguments: [uri]
        }, onSuccess(success, { error: error }));
    }
    Karaf.installRepository = installRepository;
    function uninstallRepository(workspace, jolokia, uri, success, error) {
        Karaf.log.info("uninstalling URI: ", uri);
        jolokia.request({
            type: 'exec',
            mbean: getSelectionFeaturesMBean(workspace),
            operation: 'removeRepository(java.lang.String)',
            arguments: [uri]
        }, onSuccess(success, { error: error }));
    }
    Karaf.uninstallRepository = uninstallRepository;
    function installFeature(workspace, jolokia, feature, version, success, error) {
        jolokia.request({
            type: 'exec',
            mbean: getSelectionFeaturesMBean(workspace),
            operation: 'installFeature(java.lang.String, java.lang.String)',
            arguments: [feature, version]
        }, onSuccess(success, { error: error }));
    }
    Karaf.installFeature = installFeature;
    function uninstallFeature(workspace, jolokia, feature, version, success, error) {
        jolokia.request({
            type: 'exec',
            mbean: getSelectionFeaturesMBean(workspace),
            operation: 'uninstallFeature(java.lang.String, java.lang.String)',
            arguments: [feature, version]
        }, onSuccess(success, { error: error }));
    }
    Karaf.uninstallFeature = uninstallFeature;
    // TODO move to core?
    function toCollection(values) {
        var collection = values;
        if (!angular.isArray(values)) {
            collection = [values];
        }
        return collection;
    }
    Karaf.toCollection = toCollection;
    function featureLinks(workspace, name, version) {
        return "<a href='" + Core.url("#/karaf/feature/" + name + "/" + version + workspace.hash()) + "'>" + version + "</a>";
    }
    Karaf.featureLinks = featureLinks;
    function extractFeature(attributes, name, version) {
        var features = [];
        var repos = [];
        populateFeaturesAndRepos(attributes, features, repos);
        return features.find(function (feature) {
            return feature.Name == name && feature.Version == version;
        });
        /*
        var f = {};
        angular.forEach(attributes["Features"], (feature) => {
          angular.forEach(feature, (entry) => {
            if (entry["Name"] === name && entry["Version"] === version) {
              var deps = [];
              populateDependencies(attributes, entry["Dependencies"], deps);
              f["Name"] = entry["Name"];
              f["Version"] = entry["Version"];
              f["Bundles"] = entry["Bundles"];
              f["Dependencies"] = deps;
              f["Installed"] = entry["Installed"];
              f["Configurations"] = entry["Configurations"];
              f["Configuration Files"] = entry["Configuration Files"];
              f["Files"] = entry["Configuration Files"];
            }
          });
        });
        return f;
        */
    }
    Karaf.extractFeature = extractFeature;
    var platformBundlePatterns = [
        "^org.apache.aries",
        "^org.apache.karaf",
        "^activemq-karaf",
        "^org.apache.commons",
        "^org.apache.felix",
        "^io.fabric8",
        "^io.fabric8.fab",
        "^io.fabric8.insight",
        "^io.fabric8.mq",
        "^io.fabric8.patch",
        "^io.fabric8.runtime",
        "^io.fabric8.security",
        "^org.apache.geronimo.specs",
        "^org.apache.servicemix.bundles",
        "^org.objectweb.asm",
        "^io.hawt",
        "^javax.mail",
        "^javax",
        "^org.jvnet",
        "^org.mvel2",
        "^org.apache.mina.core",
        "^org.apache.sshd.core",
        "^org.apache.neethi",
        "^org.apache.servicemix.specs",
        "^org.apache.xbean",
        "^org.apache.santuario.xmlsec",
        "^biz.aQute.bndlib",
        "^groovy-all",
        "^com.google.guava",
        "jackson-\\w+-asl",
        "^com.fasterxml.jackson",
        "^org.ops4j",
        "^org.springframework",
        "^bcprov$",
        "^jline$",
        "scala-library$",
        "^org.scala-lang",
        "^stax2-api$",
        "^woodstox-core-asl",
        "^org.jboss.amq.mq-fabric",
        "^gravia-",
        "^joda-time$",
        "^org.apache.ws",
        "-commands$",
        "patch.patch",
        "org.fusesource.insight",
        "activeio-core",
        "activemq-osgi",
        "^org.eclipse.jetty",
        "org.codehaus.jettison.jettison",
        "org.jledit.core",
        "org.fusesource.jansi",
        "org.eclipse.equinox.region"
    ];
    var platformBundleRegex = new RegExp(platformBundlePatterns.join('|'));
    var camelBundlePatterns = ["^org.apache.camel", "camel-karaf-commands$", "activemq-camel$"];
    var camelBundleRegex = new RegExp(camelBundlePatterns.join('|'));
    var cxfBundlePatterns = ["^org.apache.cxf"];
    var cxfBundleRegex = new RegExp(cxfBundlePatterns.join('|'));
    var activemqBundlePatterns = ["^org.apache.activemq", "activemq-camel$"];
    var activemqBundleRegex = new RegExp(activemqBundlePatterns.join('|'));
    function isPlatformBundle(symbolicName) {
        return platformBundleRegex.test(symbolicName);
    }
    Karaf.isPlatformBundle = isPlatformBundle;
    function isActiveMQBundle(symbolicName) {
        return activemqBundleRegex.test(symbolicName);
    }
    Karaf.isActiveMQBundle = isActiveMQBundle;
    function isCamelBundle(symbolicName) {
        return camelBundleRegex.test(symbolicName);
    }
    Karaf.isCamelBundle = isCamelBundle;
    function isCxfBundle(symbolicName) {
        return cxfBundleRegex.test(symbolicName);
    }
    Karaf.isCxfBundle = isCxfBundle;
    function populateFeaturesAndRepos(attributes, features, repositories) {
        var fullFeatures = attributes["Features"];
        angular.forEach(attributes["Repositories"], function (repo) {
            repositories.push({
                id: repo["Name"],
                uri: repo["Uri"]
            });
            if (!fullFeatures) {
                return;
            }
            angular.forEach(repo["Features"], function (feature) {
                angular.forEach(feature, function (entry) {
                    if (fullFeatures[entry['Name']] !== undefined) {
                        var f = Object.extended(fullFeatures[entry['Name']][entry['Version']]).clone();
                        f["Id"] = entry["Name"] + "/" + entry["Version"];
                        f["RepositoryName"] = repo["Name"];
                        f["RepositoryURI"] = repo["Uri"];
                        features.push(f);
                    }
                });
            });
        });
    }
    Karaf.populateFeaturesAndRepos = populateFeaturesAndRepos;
    function createScrComponentsView(workspace, jolokia, components) {
        var result = [];
        angular.forEach(components, function (component) {
            result.push({
                Name: component,
                State: getComponentStateDescription(getComponentState(workspace, jolokia, component))
            });
        });
        return result;
    }
    Karaf.createScrComponentsView = createScrComponentsView;
    function getComponentStateDescription(state) {
        switch (state) {
            case 2:
                return "Enabled";
            case 4:
                return "Unsatisfied";
            case 8:
                return "Activating";
            case 16:
                return "Active";
            case 32:
                return "Registered";
            case 64:
                return "Factory";
            case 128:
                return "Deactivating";
            case 256:
                return "Destroying";
            case 1024:
                return "Disabling";
            case 2048:
                return "Disposing";
        }
        return "Unknown";
    }
    Karaf.getComponentStateDescription = getComponentStateDescription;
    ;
    function getAllComponents(workspace, jolokia) {
        var scrMBean = getSelectionScrMBean(workspace);
        var response = jolokia.request({
            type: 'read',
            mbean: scrMBean,
            arguments: []
        });
        //Check if the MBean provides the Components attribute.
        if (!('Components' in response.value)) {
            response = jolokia.request({
                type: 'exec',
                mbean: scrMBean,
                operation: 'listComponents()'
            });
            return createScrComponentsView(workspace, jolokia, response.value);
        }
        return response.value['Components'].values;
    }
    Karaf.getAllComponents = getAllComponents;
    function getComponentByName(workspace, jolokia, componentName) {
        var components = getAllComponents(workspace, jolokia);
        return components.find(function (c) {
            return c.Name == componentName;
        });
    }
    Karaf.getComponentByName = getComponentByName;
    function isComponentActive(workspace, jolokia, component) {
        var response = jolokia.request({
            type: 'exec',
            mbean: getSelectionScrMBean(workspace),
            operation: 'isComponentActive(java.lang.String)',
            arguments: [component]
        });
        return response.value;
    }
    Karaf.isComponentActive = isComponentActive;
    function getComponentState(workspace, jolokia, component) {
        var response = jolokia.request({
            type: 'exec',
            mbean: getSelectionScrMBean(workspace),
            operation: 'componentState(java.lang.String)',
            arguments: [component]
        });
        return response.value;
    }
    Karaf.getComponentState = getComponentState;
    function activateComponent(workspace, jolokia, component, success, error) {
        jolokia.request({
            type: 'exec',
            mbean: getSelectionScrMBean(workspace),
            operation: 'activateComponent(java.lang.String)',
            arguments: [component]
        }, onSuccess(success, { error: error }));
    }
    Karaf.activateComponent = activateComponent;
    function deactivateComponent(workspace, jolokia, component, success, error) {
        jolokia.request({
            type: 'exec',
            mbean: getSelectionScrMBean(workspace),
            operation: 'deactiveateComponent(java.lang.String)',
            arguments: [component]
        }, onSuccess(success, { error: error }));
    }
    Karaf.deactivateComponent = deactivateComponent;
    function populateDependencies(attributes, dependencies, features) {
        angular.forEach(dependencies, function (feature) {
            angular.forEach(feature, function (entry) {
                var enhancedFeature = extractFeature(attributes, entry["Name"], entry["Version"]);
                enhancedFeature["id"] = entry["Name"] + "/" + entry["Version"];
                //enhancedFeature["repository"] = repo["Name"];
                features.push(enhancedFeature);
            });
        });
    }
    Karaf.populateDependencies = populateDependencies;
    function getSelectionFeaturesMBean(workspace) {
        if (workspace) {
            var featuresStuff = workspace.mbeanTypesToDomain["features"] || {};
            var karaf = featuresStuff["org.apache.karaf"] || {};
            var mbean = karaf.objectName;
            if (mbean) {
                return mbean;
            }
            // lets navigate to the tree item based on paths
            var folder = workspace.tree.navigate("org.apache.karaf", "features");
            if (!folder) {
                // sometimes the features mbean is inside the 'root' folder
                folder = workspace.tree.navigate("org.apache.karaf");
                if (folder) {
                    var children = folder.children;
                    folder = null;
                    angular.forEach(children, function (child) {
                        if (!folder) {
                            folder = child.navigate("features");
                        }
                    });
                }
            }
            if (folder) {
                var children = folder.children;
                if (children) {
                    var node = children[0];
                    if (node) {
                        return node.objectName;
                    }
                }
                return folder.objectName;
            }
        }
        return null;
    }
    Karaf.getSelectionFeaturesMBean = getSelectionFeaturesMBean;
    function getSelectionScrMBean(workspace) {
        if (workspace) {
            var scrStuff = workspace.mbeanTypesToDomain["scr"] || {};
            var karaf = scrStuff["org.apache.karaf"] || {};
            var mbean = karaf.objectName;
            if (mbean) {
                return mbean;
            }
            // lets navigate to the tree item based on paths
            var folder = workspace.tree.navigate("org.apache.karaf", "scr");
            if (!folder) {
                // sometimes the features mbean is inside the 'root' folder
                folder = workspace.tree.navigate("org.apache.karaf");
                if (folder) {
                    var children = folder.children;
                    folder = null;
                    angular.forEach(children, function (child) {
                        if (!folder) {
                            folder = child.navigate("scr");
                        }
                    });
                }
            }
            if (folder) {
                var children = folder.children;
                if (children) {
                    var node = children[0];
                    if (node) {
                        return node.objectName;
                    }
                }
                return folder.objectName;
            }
        }
        return null;
    }
    Karaf.getSelectionScrMBean = getSelectionScrMBean;
})(Karaf || (Karaf = {}));

/// <reference path="../../includes.ts"/>
/// <reference path="karafHelpers.ts"/>
/**
 * @module Karaf
 * @main Karaf
 */
var Karaf;
(function (Karaf) {
    var pluginName = 'karaf';
    Karaf._module = angular.module(pluginName, ['bootstrap', 'ngResource', 'hawtioCore']);
    Karaf._module.config(["$routeProvider", function ($routeProvider) {
        $routeProvider.when('/osgi/server', { templateUrl: 'app/karaf/html/server.html' }).when('/osgi/features', { templateUrl: 'app/karaf/html/features.html', reloadOnSearch: false }).when('/osgi/scr-components', { templateUrl: 'app/karaf/html/scr-components.html' }).when('/osgi/scr-component/:name', { templateUrl: 'app/karaf/html/scr-component.html' }).when('/osgi/feature/:name/:version', { templateUrl: 'app/karaf/html/feature.html' });
    }]);
    Karaf._module.run(["workspace", "viewRegistry", "helpRegistry", function (workspace, viewRegistry, helpRegistry) {
        helpRegistry.addUserDoc('karaf', 'app/karaf/doc/help.md', function () {
            return workspace.treeContainsDomainAndProperties('org.apache.karaf');
        });
    }]);
    hawtioPluginLoader.addModule(pluginName);
})(Karaf || (Karaf = {}));

/// <reference path="../../includes.ts"/>
/// <reference path="karafPlugin.ts"/>
/**
 * @module Karaf
 */
var Karaf;
(function (Karaf) {
    Karaf._module.controller("Karaf.FeatureController", ["$scope", "jolokia", "workspace", "$routeParams", function ($scope, jolokia, workspace, $routeParams) {
        $scope.hasFabric = Fabric.hasFabric(workspace);
        $scope.name = $routeParams.name;
        $scope.version = $routeParams.version;
        $scope.bundlesByLocation = {};
        $scope.props = "properties";
        updateTableContents();
        $scope.install = function () {
            Karaf.installFeature(workspace, jolokia, $scope.name, $scope.version, function () {
                Core.notification('success', 'Installed feature ' + $scope.name);
            }, function (response) {
                Core.notification('error', 'Failed to install feature ' + $scope.name + ' due to ' + response.error);
            });
        };
        $scope.uninstall = function () {
            Karaf.uninstallFeature(workspace, jolokia, $scope.name, $scope.version, function () {
                Core.notification('success', 'Uninstalled feature ' + $scope.name);
            }, function (response) {
                Core.notification('error', 'Failed to uninstall feature ' + $scope.name + ' due to ' + response.error);
            });
        };
        $scope.toProperties = function (elements) {
            var answer = '';
            angular.forEach(elements, function (value, name) {
                answer += value['Key'] + " = " + value['Value'] + "\n";
            });
            return answer.trim();
        };
        function populateTable(response) {
            $scope.row = Karaf.extractFeature(response.value, $scope.name, $scope.version);
            if ($scope.row) {
                addBundleDetails($scope.row);
                var dependencies = [];
                //TODO - if the version isn't set or is 0.0.0 then maybe we show the highest available?
                angular.forEach($scope.row.Dependencies, function (version, name) {
                    angular.forEach(version, function (data, version) {
                        dependencies.push({
                            Name: name,
                            Version: version
                        });
                    });
                });
                $scope.row.Dependencies = dependencies;
            }
            //console.log("row: ", $scope.row);
            Core.$apply($scope);
        }
        function setBundles(response) {
            var bundleMap = {};
            Osgi.defaultBundleValues(workspace, $scope, response.values);
            angular.forEach(response.value, function (bundle) {
                var location = bundle["Location"];
                $scope.bundlesByLocation[location] = bundle;
            });
        }
        ;
        function updateTableContents() {
            var featureMbean = Karaf.getSelectionFeaturesMBean(workspace);
            var bundleMbean = Osgi.getSelectionBundleMBean(workspace);
            var jolokia = workspace.jolokia;
            if (bundleMbean) {
                setBundles(jolokia.request({ type: 'exec', mbean: bundleMbean, operation: 'listBundles()' }));
            }
            if (featureMbean) {
                jolokia.request({ type: 'read', mbean: featureMbean }, onSuccess(populateTable));
            }
        }
        function addBundleDetails(feature) {
            var bundleDetails = [];
            angular.forEach(feature["Bundles"], function (bundleLocation) {
                var bundle = $scope.bundlesByLocation[bundleLocation];
                if (bundle) {
                    bundle["Installed"] = true;
                    bundleDetails.push(bundle);
                }
                else {
                    bundleDetails.push({
                        "Location": bundleLocation,
                        "Installed": false
                    });
                }
            });
            feature["BundleDetails"] = bundleDetails;
        }
    }]);
})(Karaf || (Karaf = {}));

/// <reference path="../../includes.ts"/>
/// <reference path="karafPlugin.ts"/>
/**
 * @module Karaf
 */
var Karaf;
(function (Karaf) {
    Karaf._module.controller("Karaf.FeaturesController", ["$scope", "$location", "workspace", "jolokia", function ($scope, $location, workspace, jolokia) {
        $scope.hasFabric = Fabric.hasFabric(workspace);
        $scope.responseJson = '';
        $scope.filter = '';
        $scope.installedFeatures = [];
        $scope.features = [];
        $scope.repositories = [];
        $scope.selectedRepositoryId = '';
        $scope.selectedRepository = {};
        $scope.newRepositoryURI = '';
        $scope.init = function () {
            var selectedRepositoryId = $location.search()['repositoryId'];
            if (selectedRepositoryId) {
                $scope.selectedRepositoryId = selectedRepositoryId;
            }
            var filter = $location.search()['filter'];
            if (filter) {
                $scope.filter = filter;
            }
        };
        $scope.init();
        $scope.$watch('selectedRepository', function (newValue, oldValue) {
            //log.debug("selectedRepository: ", $scope.selectedRepository);
            if (newValue !== oldValue) {
                if (!newValue) {
                    $scope.selectedRepositoryId = '';
                }
                else {
                    $scope.selectedRepositoryId = newValue['repository'];
                }
                $location.search('repositoryId', $scope.selectedRepositoryId);
            }
        }, true);
        $scope.$watch('filter', function (newValue, oldValue) {
            if (newValue !== oldValue) {
                $location.search('filter', newValue);
            }
        });
        var featuresMBean = Karaf.getSelectionFeaturesMBean(workspace);
        Karaf.log.debug("Features mbean: ", featuresMBean);
        if (featuresMBean) {
            Core.register(jolokia, $scope, {
                type: 'read',
                mbean: featuresMBean
            }, onSuccess(render));
        }
        $scope.inSelectedRepository = function (feature) {
            if (!$scope.selectedRepository || !('repository' in $scope.selectedRepository)) {
                return "";
            }
            if (!feature || !('RepositoryName' in feature)) {
                return "";
            }
            if (feature['RepositoryName'] === $scope.selectedRepository['repository']) {
                return "in-selected-repository";
            }
            return "";
        };
        $scope.isValidRepository = function () {
            return Core.isBlank($scope.newRepositoryURI);
        };
        $scope.installRepository = function () {
            var repoURL = $scope.newRepositoryURI;
            Core.notification('info', 'Adding feature repository URL');
            Karaf.installRepository(workspace, jolokia, repoURL, function () {
                Core.notification('success', 'Added feature repository URL');
                $scope.selectedRepository = {};
                $scope.selectedRepositoryId = '';
                $scope.responseJson = null;
                $scope.triggerRefresh();
            }, function (response) {
                Karaf.log.error('Failed to add feature repository URL ', repoURL, ' due to ', response.error);
                Karaf.log.info('stack trace: ', response.stacktrace);
                Core.$apply($scope);
            });
        };
        $scope.uninstallRepository = function () {
            var repoURI = $scope.selectedRepository['uri'];
            Core.notification('info', 'Removing feature repository ' + repoURI);
            Karaf.uninstallRepository(workspace, jolokia, repoURI, function () {
                Core.notification('success', 'Removed feature repository ' + repoURI);
                $scope.responseJson = null;
                $scope.selectedRepositoryId = '';
                $scope.selectedRepository = {};
                $scope.triggerRefresh();
            }, function (response) {
                Karaf.log.error('Failed to remove feature repository ', repoURI, ' due to ', response.error);
                Karaf.log.info('stack trace: ', response.stacktrace);
                Core.$apply($scope);
            });
        };
        $scope.triggerRefresh = function () {
            jolokia.request({
                type: 'read',
                method: 'POST',
                mbean: featuresMBean
            }, onSuccess(render));
        };
        $scope.install = function (feature) {
            if ($scope.hasFabric) {
                return;
            }
            //$('.popover').remove();
            Core.notification('info', 'Installing feature ' + feature.Name);
            Karaf.installFeature(workspace, jolokia, feature.Name, feature.Version, function () {
                Core.notification('success', 'Installed feature ' + feature.Name);
                $scope.installedFeatures.add(feature);
                $scope.responseJson = null;
                $scope.triggerRefresh();
                //Core.$apply($scope);
            }, function (response) {
                Karaf.log.error('Failed to install feature ', feature.Name, ' due to ', response.error);
                Karaf.log.info('stack trace: ', response.stacktrace);
                Core.$apply($scope);
            });
        };
        $scope.uninstall = function (feature) {
            if ($scope.hasFabric) {
                return;
            }
            //$('.popover').remove();
            Core.notification('info', 'Uninstalling feature ' + feature.Name);
            Karaf.uninstallFeature(workspace, jolokia, feature.Name, feature.Version, function () {
                Core.notification('success', 'Uninstalled feature ' + feature.Name);
                $scope.installedFeatures.remove(feature);
                $scope.responseJson = null;
                $scope.triggerRefresh();
                //Core.$apply($scope);
            }, function (response) {
                Karaf.log.error('Failed to uninstall feature ', feature.Name, ' due to ', response.error);
                Karaf.log.info('stack trace: ', response.stacktrace);
                Core.$apply($scope);
            });
        };
        $scope.filteredRows = ['Bundles', 'Configurations', 'Configuration Files', 'Dependencies'];
        $scope.showRow = function (key, value) {
            if ($scope.filteredRows.any(key)) {
                return false;
            }
            if (angular.isArray(value)) {
                if (value.length === 0) {
                    return false;
                }
            }
            if (angular.isString(value)) {
                if (Core.isBlank(value)) {
                    return false;
                }
            }
            if (angular.isObject(value)) {
                if (!value || Object.equal(value, {})) {
                    return false;
                }
            }
            return true;
        };
        $scope.installed = function (installed) {
            var answer = Core.parseBooleanValue(installed);
            return answer;
        };
        $scope.showValue = function (value) {
            if (angular.isArray(value)) {
                var answer = ['<ul class="zebra-list">'];
                value.forEach(function (v) {
                    answer.push('<li>' + v + '</li>');
                });
                answer.push('</ul>');
                return answer.join('\n');
            }
            if (angular.isObject(value)) {
                var answer = ['<table class="table">', '<tbody>'];
                angular.forEach(value, function (value, key) {
                    answer.push('<tr>');
                    answer.push('<td>' + key + '</td>');
                    answer.push('<td>' + value + '</td>');
                    answer.push('</tr>');
                });
                answer.push('</tbody>');
                answer.push('</table>');
                return answer.join('\n');
            }
            return "" + value;
        };
        $scope.getStateStyle = function (feature) {
            if (Core.parseBooleanValue(feature.Installed)) {
                return "badge badge-success";
            }
            return "badge";
        };
        $scope.filterFeature = function (feature) {
            if (Core.isBlank($scope.filter)) {
                return true;
            }
            if (feature.Id.has($scope.filter)) {
                return true;
            }
            return false;
        };
        function render(response) {
            var responseJson = angular.toJson(response.value);
            if ($scope.responseJson !== responseJson) {
                $scope.responseJson = responseJson;
                //log.debug("Got response: ", response.value);
                if (response['value']['Features'] === null) {
                    $scope.featuresError = true;
                }
                else {
                    $scope.featuresError = false;
                }
                $scope.features = [];
                $scope.repositories = [];
                var features = [];
                var repositories = [];
                Karaf.populateFeaturesAndRepos(response.value, features, repositories);
                var installedFeatures = features.filter(function (f) {
                    return Core.parseBooleanValue(f.Installed);
                });
                var uninstalledFeatures = features.filter(function (f) {
                    return !Core.parseBooleanValue(f.Installed);
                });
                //log.debug("repositories: ", repositories);
                $scope.installedFeatures = installedFeatures.sortBy(function (f) {
                    return f['Name'];
                });
                uninstalledFeatures = uninstalledFeatures.sortBy(function (f) {
                    return f['Name'];
                });
                repositories.sortBy('id').forEach(function (repo) {
                    $scope.repositories.push({
                        repository: repo['id'],
                        uri: repo['uri'],
                        features: uninstalledFeatures.filter(function (f) {
                            return f['RepositoryName'] === repo['id'];
                        })
                    });
                });
                if (!Core.isBlank($scope.newRepositoryURI)) {
                    var selectedRepo = repositories.find(function (r) {
                        return r['uri'] === $scope.newRepositoryURI;
                    });
                    if (selectedRepo) {
                        $scope.selectedRepositoryId = selectedRepo['id'];
                    }
                    $scope.newRepositoryURI = '';
                }
                if (Core.isBlank($scope.selectedRepositoryId)) {
                    $scope.selectedRepository = $scope.repositories.first();
                }
                else {
                    $scope.selectedRepository = $scope.repositories.find(function (r) {
                        return r.repository === $scope.selectedRepositoryId;
                    });
                }
                Core.$apply($scope);
            }
        }
    }]);
})(Karaf || (Karaf = {}));

/// <reference path="../../includes.ts"/>
/// <reference path="karafHelpers.ts"/>
/**
 * @module Karaf
 */
var Karaf;
(function (Karaf) {
    Karaf._module.controller("Karaf.NavBarController", ["$scope", "workspace", function ($scope, workspace) {
        $scope.hash = workspace.hash();
        $scope.isKarafEnabled = workspace.treeContainsDomainAndProperties("org.apache.karaf");
        $scope.isFeaturesEnabled = Karaf.getSelectionFeaturesMBean(workspace);
        $scope.isScrEnabled = Karaf.getSelectionScrMBean(workspace);
        $scope.$on('$routeChangeSuccess', function () {
            $scope.hash = workspace.hash();
        });
        $scope.isActive = function (nav) {
            return workspace.isLinkActive(nav);
        };
        $scope.isPrefixActive = function (nav) {
            return workspace.isLinkPrefixActive(nav);
        };
    }]);
})(Karaf || (Karaf = {}));

/// <reference path="../../includes.ts"/>
/// <reference path="karafHelpers.ts"/>
/**
 * @module Karaf
 */
var Karaf;
(function (Karaf) {
    Karaf._module.controller("Karaf.ScrComponentController", ["$scope", "$location", "workspace", "jolokia", "$routeParams", function ($scope, $location, workspace, jolokia, $routeParams) {
        $scope.name = $routeParams.name;
        populateTable();
        function populateTable() {
            $scope.row = Karaf.getComponentByName(workspace, jolokia, $scope.name);
            Core.$apply($scope);
        }
        $scope.activate = function () {
            Karaf.activateComponent(workspace, jolokia, $scope.row['Name'], function () {
                console.log("Activated!");
            }, function () {
                console.log("Failed to activate!");
            });
        };
        $scope.deactivate = function () {
            Karaf.deactivateComponent(workspace, jolokia, $scope.row['Name'], function () {
                console.log("Deactivated!");
            }, function () {
                console.log("Failed to deactivate!");
            });
        };
    }]);
})(Karaf || (Karaf = {}));

/// <reference path="../../includes.ts"/>
/// <reference path="karafHelpers.ts"/>
/**
 * @module Karaf
 */
var Karaf;
(function (Karaf) {
    Karaf._module.controller("Karaf.ScrComponentsController", ["$scope", "$location", "workspace", "jolokia", function ($scope, $location, workspace, jolokia) {
        $scope.component = empty();
        // caches last jolokia result
        $scope.result = [];
        // rows in components table
        $scope.components = [];
        // selected components
        $scope.selectedComponents = [];
        $scope.scrOptions = {
            //plugins: [searchProvider],
            data: 'components',
            showFilter: false,
            showColumnMenu: false,
            filterOptions: {
                useExternalFilter: false
            },
            sortInfo: { fields: ['Name'], directions: ['asc'] },
            selectedItems: $scope.selectedComponents,
            rowHeight: 32,
            selectWithCheckboxOnly: true,
            columnDefs: [
                {
                    field: 'Name',
                    displayName: 'Name',
                    cellTemplate: '<div class="ngCellText"><a href="#/osgi/scr-component/{{row.entity.Name}}?p=container">{{row.getProperty(col.field)}}</a></div>',
                    width: 400
                },
                {
                    field: 'State',
                    displayName: 'State',
                    cellTemplate: '<div class="ngCellText">{{row.getProperty(col.field)}}</div>',
                    width: 200
                }
            ]
        };
        var scrMBean = Karaf.getSelectionScrMBean(workspace);
        if (scrMBean) {
            render(Karaf.getAllComponents(workspace, jolokia));
        }
        $scope.activate = function () {
            $scope.selectedComponents.forEach(function (component) {
                Karaf.activateComponent(workspace, jolokia, component.Name, function () {
                    console.log("Activated!");
                }, function () {
                    console.log("Failed to activate!");
                });
            });
        };
        $scope.deactivate = function () {
            $scope.selectedComponents.forEach(function (component) {
                Karaf.deactivateComponent(workspace, jolokia, component.Name, function () {
                    console.log("Deactivated!");
                }, function () {
                    console.log("Failed to deactivate!");
                });
            });
        };
        function empty() {
            return [
                { Name: "", Status: false }
            ];
        }
        function render(components) {
            if (!Object.equal($scope.result, components)) {
                $scope.components = components;
                $scope.result = $scope.components;
                Core.$apply($scope);
            }
        }
    }]);
})(Karaf || (Karaf = {}));

/// <reference path="../../includes.ts"/>
/// <reference path="karafHelpers.ts"/>
/**
 * @module Karaf
 */
var Karaf;
(function (Karaf) {
    Karaf._module.controller("Karaf.ServerController", ["$scope", "$location", "workspace", "jolokia", function ($scope, $location, workspace, jolokia) {
        $scope.data = {
            name: "",
            version: "",
            state: "",
            root: "",
            startLevel: "",
            framework: "",
            frameworkVersion: "",
            location: "",
            sshPort: "",
            rmiRegistryPort: "",
            rmiServerPort: "",
            pid: ""
        };
        $scope.$on('jmxTreeUpdated', reloadFunction);
        $scope.$watch('workspace.tree', reloadFunction);
        function reloadFunction() {
            // if the JMX tree is reloaded its probably because a new MBean has been added or removed
            // so lets reload, asynchronously just in case
            setTimeout(loadData, 50);
        }
        function loadData() {
            console.log("Loading Karaf data...");
            jolokia.search("org.apache.karaf:type=admin,*", onSuccess(render));
        }
        function render(response) {
            // grab the first mbean as there should ideally only be one karaf in the JVM
            if (angular.isArray(response)) {
                var mbean = response[0];
                if (mbean) {
                    jolokia.getAttribute(mbean, "Instances", onSuccess(function (response) {
                        onInstances(response, mbean);
                    }));
                }
            }
        }
        function onInstances(instances, mbean) {
            if (instances) {
                var parsedMBean = Core.parseMBean(mbean);
                var instanceName = 'root';
                if ('attributes' in parsedMBean) {
                    if ('name' in parsedMBean['attributes']) {
                        instanceName = parsedMBean['attributes']['name'];
                    }
                }
                //log.debug("mbean: ", Core.parseMBean(mbean));
                //log.debug("Instances: ", instances);
                // the name is the first child
                var rootInstance = instances[instanceName];
                $scope.data.name = rootInstance.Name;
                $scope.data.state = rootInstance.State;
                $scope.data.root = rootInstance["Is Root"];
                $scope.data.location = rootInstance.Location;
                $scope.data.sshPort = rootInstance["SSH Port"];
                $scope.data.rmiRegistryPort = rootInstance["RMI Registry Port"];
                $scope.data.rmiServerPort = rootInstance["RMI Server Port"];
                $scope.data.pid = rootInstance.Pid;
                // we need to get these data from the system mbean
                $scope.data.version = "?";
                $scope.data.startLevel = "?";
                $scope.data.framework = "?";
                $scope.data.frameworkVersion = "?";
                var systemMbean = "org.apache.karaf:type=system,name=" + rootInstance.Name;
                // get more data, and its okay to do this synchronously
                var response = jolokia.request({ type: "read", mbean: systemMbean, attribute: ["StartLevel", "Framework", "Version"] }, onSuccess(null));
                var obj = response.value;
                if (obj) {
                    $scope.data.version = obj.Version;
                    $scope.data.startLevel = obj.StartLevel;
                    $scope.data.framework = obj.Framework;
                }
                // and the osgi framework version is the bundle version
                var response2 = jolokia.search("osgi.core:type=bundleState,*", onSuccess(null));
                if (angular.isArray(response2)) {
                    var mbean = response2[0];
                    if (mbean) {
                        // get more data, and its okay to do this synchronously
                        var response3 = jolokia.request({ type: 'exec', mbean: mbean, operation: 'getVersion(long)', arguments: [0] }, onSuccess(null));
                        var obj3 = response3.value;
                        if (obj3) {
                            $scope.data.frameworkVersion = obj3;
                        }
                    }
                }
            }
            // ensure web page is updated
            Core.$apply($scope);
        }
    }]);
})(Karaf || (Karaf = {}));

/// <reference path="../../includes.ts"/>

/// <reference path="../../includes.ts"/>
/// <reference path="dockerRegistryInterfaces.ts"/>
var DockerRegistry;
(function (DockerRegistry) {
    DockerRegistry.context = '/docker-registry';
    DockerRegistry.hash = UrlHelpers.join('#', DockerRegistry.context);
    DockerRegistry.defaultRoute = UrlHelpers.join(DockerRegistry.hash, 'list');
    DockerRegistry.basePath = UrlHelpers.join('app', DockerRegistry.context);
    DockerRegistry.templatePath = UrlHelpers.join(DockerRegistry.basePath, 'html');
    DockerRegistry.pluginName = 'DockerRegistry';
    DockerRegistry.log = Logger.get(DockerRegistry.pluginName);
    DockerRegistry.SEARCH_FRAGMENT = '/v1/search';
    /**
     * Fetch the available docker images in the registry, can only
     * be called after app initialization
     */
    function getDockerImageRepositories(callback) {
        var DockerRegistryRestURL = HawtioCore.injector.get("DockerRegistryRestURL");
        var $http = HawtioCore.injector.get("$http");
        DockerRegistryRestURL.then(function (restURL) {
            $http.get(UrlHelpers.join(restURL, DockerRegistry.SEARCH_FRAGMENT)).success(function (data) {
                callback(restURL, data);
            }).error(function (data) {
                DockerRegistry.log.debug("Error fetching image repositories:", data);
                callback(restURL, null);
            });
        });
    }
    DockerRegistry.getDockerImageRepositories = getDockerImageRepositories;
    function completeDockerRegistry() {
        var $q = HawtioCore.injector.get("$q");
        var $rootScope = HawtioCore.injector.get("$rootScope");
        var deferred = $q.defer();
        getDockerImageRepositories(function (restURL, repositories) {
            if (repositories && repositories.results) {
                // log.debug("Got back repositories: ", repositories);
                var results = repositories.results;
                results = results.sortBy(function (res) {
                    return res.name;
                }).first(15);
                results = results.map(function (res) {
                    return res.name;
                });
                // log.debug("Results: ", results);
                deferred.resolve(results);
            }
            else {
                // log.debug("didn't get back anything, bailing");
                deferred.reject([]);
            }
        });
        return deferred.promise;
    }
    DockerRegistry.completeDockerRegistry = completeDockerRegistry;
})(DockerRegistry || (DockerRegistry = {}));

/// <reference path="../../includes.ts"/>
/// <reference path="dockerRegistryHelpers.ts"/>
var DockerRegistry;
(function (DockerRegistry) {
    DockerRegistry._module = angular.module(DockerRegistry.pluginName, ['hawtioCore', 'ngResource']);
    DockerRegistry.controller = PluginHelpers.createControllerFunction(DockerRegistry._module, DockerRegistry.pluginName);
    DockerRegistry.route = PluginHelpers.createRoutingFunction(DockerRegistry.templatePath);
    DockerRegistry._module.config(['$routeProvider', function ($routeProvider) {
        $routeProvider.when(UrlHelpers.join(DockerRegistry.context, 'list'), DockerRegistry.route('list.html', false));
    }]);
    DockerRegistry._module.factory('DockerRegistryRestURL', ['jolokiaUrl', 'jolokia', '$q', '$rootScope', function (jolokiaUrl, jolokia, $q, $rootScope) {
        var answer = $q.defer();
        jolokia.getAttribute(Kubernetes.managerMBean, 'DockerRegistry', undefined, Core.onSuccess(function (response) {
            var proxified = UrlHelpers.maybeProxy(jolokiaUrl, response);
            DockerRegistry.log.debug("Discovered docker registry API URL: ", proxified);
            answer.resolve(proxified);
            Core.$apply($rootScope);
        }, {
            error: function (response) {
                DockerRegistry.log.debug("error fetching docker registry API details: ", response);
                answer.reject(response);
                Core.$apply($rootScope);
            }
        }));
        return answer.promise;
    }]);
    DockerRegistry._module.run(['viewRegistry', 'workspace', function (viewRegistry, workspace) {
        DockerRegistry.log.debug("Running");
        viewRegistry['docker-registry'] = UrlHelpers.join(DockerRegistry.templatePath, 'layoutDockerRegistry.html');
        workspace.topLevelTabs.push({
            id: 'docker-registry',
            content: 'Images',
            isValid: function (workspace) { return workspace.treeContainsDomainAndProperties(Fabric.jmxDomain, { type: 'KubernetesManager' }); },
            isActive: function (workspace) { return workspace.isLinkActive('docker-registry'); },
            href: function () { return DockerRegistry.defaultRoute; }
        });
    }]);
    hawtioPluginLoader.addModule(DockerRegistry.pluginName);
})(DockerRegistry || (DockerRegistry = {}));

/// <reference path="../../includes.ts"/>
/// <reference path="dockerRegistryHelpers.ts"/>
var DockerRegistry;
(function (DockerRegistry) {
    DockerRegistry.TopLevel = DockerRegistry.controller("TopLevel", ["$scope", "$http", "$timeout", function ($scope, $http, $timeout) {
        $scope.repositories = [];
        $scope.fetched = false;
        $scope.restURL = '';
        DockerRegistry.getDockerImageRepositories(function (restURL, repositories) {
            $scope.restURL = restURL;
            $scope.fetched = true;
            if (repositories) {
                $scope.repositories = repositories.results;
                var previous = angular.toJson($scope.repositories);
                $scope.fetch = PollHelpers.setupPolling($scope, function (next) {
                    var searchURL = UrlHelpers.join($scope.restURL, DockerRegistry.SEARCH_FRAGMENT);
                    $http.get(searchURL).success(function (repositories) {
                        if (repositories && repositories.results) {
                            if (previous !== angular.toJson(repositories.results)) {
                                $scope.repositories = repositories.results;
                                previous = angular.toJson($scope.repositories);
                            }
                        }
                        next();
                    });
                });
                $scope.fetch();
            }
            else {
                DockerRegistry.log.debug("Failed initial fetch of image repositories");
            }
        });
        $scope.$watchCollection('repositories', function (repositories) {
            if (!Core.isBlank($scope.restURL)) {
                if (!repositories || repositories.length === 0) {
                    $scope.$broadcast("DockerRegistry.Repositories", $scope.restURL, repositories);
                    return;
                }
                // we've a new list of repositories, let's refresh our info on 'em
                var outstanding = repositories.length;
                function maybeNotify() {
                    outstanding = outstanding - 1;
                    if (outstanding <= 0) {
                        $scope.$broadcast("DockerRegistry.Repositories", $scope.restURL, repositories);
                    }
                }
                repositories.forEach(function (repository) {
                    var tagURL = UrlHelpers.join($scope.restURL, 'v1/repositories/' + repository.name + '/tags');
                    // we'll give it half a second as sometimes tag info isn't instantly available
                    $timeout(function () {
                        DockerRegistry.log.debug("Fetching tags from URL: ", tagURL);
                        $http.get(tagURL).success(function (tags) {
                            DockerRegistry.log.debug("Got tags: ", tags, " for image repository: ", repository.name);
                            repository.tags = tags;
                            maybeNotify();
                        }).error(function (data) {
                            DockerRegistry.log.debug("Error fetching data for image repository: ", repository.name, " error: ", data);
                            maybeNotify();
                        });
                    }, 500);
                });
            }
        });
    }]);
})(DockerRegistry || (DockerRegistry = {}));

/// <reference path="../../includes.ts"/>
/// <reference path="dockerRegistryHelpers.ts"/>
var DockerRegistry;
(function (DockerRegistry) {
    DockerRegistry.TagController = DockerRegistry.controller("TagController", ["$scope", function ($scope) {
        $scope.selectImage = function (imageID) {
            $scope.$emit("DockerRegistry.SelectedImageID", imageID);
        };
    }]);
    DockerRegistry.ListController = DockerRegistry.controller("ListController", ["$scope", "$templateCache", "$http", function ($scope, $templateCache, $http) {
        $scope.imageRepositories = [];
        $scope.selectedImage = undefined;
        $scope.tableConfig = {
            data: 'imageRepositories',
            showSelectionCheckbox: true,
            enableRowClickSelection: false,
            multiSelect: true,
            selectedItems: [],
            filterOptions: {
                filterText: ''
            },
            columnDefs: [
                { field: 'name', displayName: 'Name', defaultSort: true },
                { field: 'description', displayName: 'Description' },
                { field: 'tags', displayName: 'Tags', cellTemplate: $templateCache.get("tagsTemplate.html") }
            ]
        };
        $scope.deletePrompt = function (selectedRepositories) {
            UI.multiItemConfirmActionDialog({
                collection: selectedRepositories,
                index: 'name',
                onClose: function (result) {
                    if (result) {
                        selectedRepositories.forEach(function (repository) {
                            var deleteURL = UrlHelpers.join($scope.restURL, '/v1/repositories/' + repository.name + '/');
                            DockerRegistry.log.debug("Using URL: ", deleteURL);
                            $http.delete(deleteURL).success(function (data) {
                                DockerRegistry.log.debug("Deleted repository: ", repository.name);
                            }).error(function (data) {
                                DockerRegistry.log.debug("Failed to delete repository: ", repository.name);
                            });
                        });
                    }
                },
                title: 'Delete Repositories?',
                action: 'The following repositories will be deleted:',
                okText: 'Delete',
                okClass: 'btn-danger',
                custom: 'This operation is permanent once completed!',
                customClass: 'alert alert-warning'
            }).open();
        };
        $scope.$on("DockerRegistry.SelectedImageID", function ($event, imageID) {
            var imageJsonURL = UrlHelpers.join($scope.restURL, '/v1/images/' + imageID + '/json');
            $http.get(imageJsonURL).success(function (image) {
                DockerRegistry.log.debug("Got image: ", image);
                $scope.selectedImage = image;
            });
        });
        $scope.$on('DockerRegistry.Repositories', function ($event, restURL, repositories) {
            $scope.imageRepositories = repositories;
        });
    }]);
})(DockerRegistry || (DockerRegistry = {}));

/// <reference path="../../includes.ts"/>
/// <reference path="gitHelpers.ts"/>
/**
 * @module Git
 * @main Git
 */
var Git;
(function (Git) {
    /**
     * A default implementation which uses jolokia and the
     * GitFacadeMXBean over JMX
     *
     * @class JolokiaGit
     * @uses GitRepository
     *
     */
    var JolokiaGit = (function () {
        function JolokiaGit(mbean, jolokia, localStorage, userDetails, branch) {
            if (branch === void 0) { branch = "master"; }
            this.mbean = mbean;
            this.jolokia = jolokia;
            this.localStorage = localStorage;
            this.userDetails = userDetails;
            this.branch = branch;
        }
        JolokiaGit.prototype.getRepositoryLabel = function (fn, error) {
            return this.jolokia.request({ type: "read", mbean: this.mbean, attribute: ["RepositoryLabel"] }, Core.onSuccess(function (result) {
                fn(result.value.RepositoryLabel);
            }, { error: error }));
        };
        JolokiaGit.prototype.exists = function (branch, path, fn) {
            var result;
            if (angular.isDefined(fn) && fn) {
                result = this.jolokia.execute(this.mbean, "exists", branch, path, Core.onSuccess(fn));
            }
            else {
                result = this.jolokia.execute(this.mbean, "exists", branch, path);
            }
            if (angular.isDefined(result) && result) {
                return true;
            }
            else {
                return false;
            }
        };
        JolokiaGit.prototype.read = function (branch, path, fn) {
            return this.jolokia.execute(this.mbean, "read", branch, path, Core.onSuccess(fn));
        };
        JolokiaGit.prototype.write = function (branch, path, commitMessage, contents, fn) {
            var authorName = this.getUserName();
            var authorEmail = this.getUserEmail();
            return this.jolokia.execute(this.mbean, "write", branch, path, commitMessage, authorName, authorEmail, contents, Core.onSuccess(fn));
        };
        JolokiaGit.prototype.writeBase64 = function (branch, path, commitMessage, contents, fn) {
            var authorName = this.getUserName();
            var authorEmail = this.getUserEmail();
            return this.jolokia.execute(this.mbean, "writeBase64", branch, path, commitMessage, authorName, authorEmail, contents, Core.onSuccess(fn));
        };
        JolokiaGit.prototype.createDirectory = function (branch, path, commitMessage, fn) {
            var authorName = this.getUserName();
            var authorEmail = this.getUserEmail();
            return this.jolokia.execute(this.mbean, "createDirectory", branch, path, commitMessage, authorName, authorEmail, Core.onSuccess(fn));
        };
        JolokiaGit.prototype.revertTo = function (branch, objectId, blobPath, commitMessage, fn) {
            var authorName = this.getUserName();
            var authorEmail = this.getUserEmail();
            return this.jolokia.execute(this.mbean, "revertTo", branch, objectId, blobPath, commitMessage, authorName, authorEmail, Core.onSuccess(fn));
        };
        JolokiaGit.prototype.rename = function (branch, oldPath, newPath, commitMessage, fn) {
            var authorName = this.getUserName();
            var authorEmail = this.getUserEmail();
            return this.jolokia.execute(this.mbean, "rename", branch, oldPath, newPath, commitMessage, authorName, authorEmail, Core.onSuccess(fn));
        };
        JolokiaGit.prototype.remove = function (branch, path, commitMessage, fn) {
            var authorName = this.getUserName();
            var authorEmail = this.getUserEmail();
            return this.jolokia.execute(this.mbean, "remove", branch, path, commitMessage, authorName, authorEmail, Core.onSuccess(fn));
        };
        JolokiaGit.prototype.completePath = function (branch, completionText, directoriesOnly, fn) {
            return this.jolokia.execute(this.mbean, "completePath", branch, completionText, directoriesOnly, Core.onSuccess(fn));
        };
        JolokiaGit.prototype.history = function (branch, objectId, path, limit, fn) {
            return this.jolokia.execute(this.mbean, "history", branch, objectId, path, limit, Core.onSuccess(fn));
        };
        JolokiaGit.prototype.commitTree = function (commitId, fn) {
            return this.jolokia.execute(this.mbean, "getCommitTree", commitId, Core.onSuccess(fn));
        };
        JolokiaGit.prototype.commitInfo = function (commitId, fn) {
            return this.jolokia.execute(this.mbean, "getCommitInfo", commitId, Core.onSuccess(fn));
        };
        JolokiaGit.prototype.diff = function (objectId, baseObjectId, path, fn) {
            return this.jolokia.execute(this.mbean, "diff", objectId, baseObjectId, path, Core.onSuccess(fn));
        };
        JolokiaGit.prototype.getContent = function (objectId, blobPath, fn) {
            return this.jolokia.execute(this.mbean, "getContent", objectId, blobPath, Core.onSuccess(fn));
        };
        JolokiaGit.prototype.readJsonChildContent = function (path, nameWildcard, search, fn) {
            return this.jolokia.execute(this.mbean, "readJsonChildContent", this.branch, path, nameWildcard, search, Core.onSuccess(fn));
        };
        JolokiaGit.prototype.branches = function (fn) {
            return this.jolokia.execute(this.mbean, "branches", Core.onSuccess(fn));
        };
        // TODO move...
        JolokiaGit.prototype.getUserName = function () {
            return this.localStorage["gitUserName"] || this.userDetails.username || "anonymous";
        };
        JolokiaGit.prototype.getUserEmail = function () {
            return this.localStorage["gitUserEmail"] || "anonymous@gmail.com";
        };
        return JolokiaGit;
    })();
    Git.JolokiaGit = JolokiaGit;
})(Git || (Git = {}));

/// <reference path="../../includes.ts"/>
/**
 * @module Camel
 */
var Camel;
(function (Camel) {
    Camel.log = Logger.get("Camel");
    Camel.jmxDomain = 'org.apache.camel';
    Camel.defaultMaximumLabelWidth = 34;
    Camel.defaultCamelMaximumTraceOrDebugBodyLength = 5000;
    Camel.defaultCamelTraceOrDebugIncludeStreams = true;
    Camel.defaultCamelRouteMetricMaxSeconds = 10;
    /**
     * Looks up the route XML for the given context and selected route and
     * processes the selected route's XML with the given function
     * @method processRouteXml
     * @param {Workspace} workspace
     * @param {Object} jolokia
     * @param {Folder} folder
     * @param {Function} onRoute
     */
    function processRouteXml(workspace, jolokia, folder, onRoute) {
        var selectedRouteId = getSelectedRouteId(workspace, folder);
        var mbean = getSelectionCamelContextMBean(workspace);
        function onRouteXml(response) {
            var route = null;
            var data = response ? response.value : null;
            if (data) {
                var doc = $.parseXML(data);
                var routes = $(doc).find("route[id='" + selectedRouteId + "']");
                if (routes && routes.length) {
                    route = routes[0];
                }
            }
            onRoute(route);
        }
        if (mbean && selectedRouteId) {
            jolokia.request({ type: 'exec', mbean: mbean, operation: 'dumpRoutesAsXml()' }, Core.onSuccess(onRouteXml, { error: onRouteXml }));
        }
        else {
            if (!selectedRouteId) {
                console.log("No selectedRouteId when trying to lazy load the route!");
            }
            onRoute(null);
        }
    }
    Camel.processRouteXml = processRouteXml;
    /**
     * Returns the URI string for the given EIP pattern node or null if it is not applicable
     * @method getRouteNodeUri
     * @param {Object} node
     * @return {String}
     */
    function getRouteNodeUri(node) {
        var uri = null;
        if (node) {
            uri = node.getAttribute("uri");
            if (!uri) {
                var ref = node.getAttribute("ref");
                if (ref) {
                    var method = node.getAttribute("method");
                    if (method) {
                        uri = ref + "." + method + "()";
                    }
                    else {
                        uri = "ref:" + ref;
                    }
                }
            }
        }
        return uri;
    }
    Camel.getRouteNodeUri = getRouteNodeUri;
    /**
     * Returns the JSON data for the camel folder; extracting it from the associated
     * routeXmlNode or using the previously extracted and/or edited JSON
     * @method getRouteFolderJSON
     * @param {Folder} folder
     * @param {Object} answer
     * @return {Object}
     */
    function getRouteFolderJSON(folder, answer) {
        if (answer === void 0) { answer = {}; }
        var nodeData = folder["camelNodeData"];
        if (!nodeData) {
            var routeXmlNode = folder["routeXmlNode"];
            if (routeXmlNode) {
                nodeData = Camel.getRouteNodeJSON(routeXmlNode);
            }
            if (!nodeData) {
                nodeData = answer;
            }
            folder["camelNodeData"] = nodeData;
        }
        return nodeData;
    }
    Camel.getRouteFolderJSON = getRouteFolderJSON;
    function getRouteNodeJSON(routeXmlNode, answer) {
        if (answer === void 0) { answer = {}; }
        if (routeXmlNode) {
            angular.forEach(routeXmlNode.attributes, function (attr) {
                answer[attr.name] = attr.value;
            });
            // lets not iterate into routes or top level tags
            var localName = routeXmlNode.localName;
            if (localName !== "route" && localName !== "routes" && localName !== "camelContext") {
                // lets look for nested elements and convert those
                // explicitly looking for expressions
                $(routeXmlNode).children("*").each(function (idx, element) {
                    var nodeName = element.localName;
                    var langSettings = Camel.camelLanguageSettings(nodeName);
                    if (langSettings) {
                        // TODO the expression key could be anything really; how should we know?
                        answer["expression"] = {
                            language: nodeName,
                            expression: element.textContent
                        };
                    }
                    else {
                        if (!isCamelPattern(nodeName)) {
                            var nested = getRouteNodeJSON(element);
                            if (nested) {
                                answer[nodeName] = nested;
                            }
                        }
                    }
                });
            }
        }
        return answer;
    }
    Camel.getRouteNodeJSON = getRouteNodeJSON;
    function increaseIndent(currentIndent, indentAmount) {
        if (indentAmount === void 0) { indentAmount = "  "; }
        return currentIndent + indentAmount;
    }
    Camel.increaseIndent = increaseIndent;
    function setRouteNodeJSON(routeXmlNode, newData, indent) {
        if (routeXmlNode) {
            var childIndent = increaseIndent(indent);
            function doUpdate(value, key, append) {
                if (append === void 0) { append = false; }
                if (angular.isArray(value)) {
                    // remove previous nodes
                    $(routeXmlNode).children(key).remove();
                    angular.forEach(value, function (item) {
                        doUpdate(item, key, true);
                    });
                }
                else if (angular.isObject(value)) {
                    // convert languages to the right xml
                    var textContent = null;
                    if (key === "expression") {
                        var languageName = value["language"];
                        if (languageName) {
                            key = languageName;
                            textContent = value["expression"];
                            value = angular.copy(value);
                            delete value["expression"];
                            delete value["language"];
                        }
                    }
                    // TODO deal with nested objects...
                    var nested = $(routeXmlNode).children(key);
                    var element = null;
                    if (append || !nested || !nested.length) {
                        var doc = routeXmlNode.ownerDocument || document;
                        routeXmlNode.appendChild(doc.createTextNode("\n" + childIndent));
                        element = doc.createElementNS(routeXmlNode.namespaceURI, key);
                        if (textContent) {
                            element.appendChild(doc.createTextNode(textContent));
                        }
                        routeXmlNode.appendChild(element);
                    }
                    else {
                        element = nested[0];
                    }
                    setRouteNodeJSON(element, value, childIndent);
                    if (textContent) {
                        nested.text(textContent);
                    }
                }
                else {
                    if (value) {
                        if (key.startsWith("_")) {
                        }
                        else {
                            var text = value.toString();
                            routeXmlNode.setAttribute(key, text);
                        }
                    }
                    else {
                        routeXmlNode.removeAttribute(key);
                    }
                }
            }
            angular.forEach(newData, function (value, key) { return doUpdate(value, key, false); });
        }
    }
    Camel.setRouteNodeJSON = setRouteNodeJSON;
    function getRouteNodeIcon(nodeSettingsOrXmlNode) {
        var nodeSettings = null;
        if (nodeSettingsOrXmlNode) {
            var nodeName = nodeSettingsOrXmlNode.localName;
            if (nodeName) {
                nodeSettings = getCamelSchema(nodeName);
            }
            else {
                nodeSettings = nodeSettingsOrXmlNode;
            }
        }
        if (nodeSettings) {
            var imageName = nodeSettings["icon"] || "generic24.png";
            return Core.url("/img/icons/camel/" + imageName);
        }
        else {
            return null;
        }
    }
    Camel.getRouteNodeIcon = getRouteNodeIcon;
    /**
     * Parse out the currently selected endpoint's name to be used when invoking on a
     * context operation that wants an endpoint name
     * @method getSelectedEndpointName
     * @param {Workspace} workspace
     * @return {any} either a string that is the endpoint name or null if it couldn't be parsed
     */
    function getSelectedEndpointName(workspace) {
        var selection = workspace.selection;
        if (selection && selection['objectName'] && selection['typeName'] && selection['typeName'] === 'endpoints') {
            var mbean = Core.parseMBean(selection['objectName']);
            if (!mbean) {
                return null;
            }
            var attributes = mbean['attributes'];
            if (!attributes) {
                return null;
            }
            if (!('name' in attributes)) {
                return null;
            }
            var uri = attributes['name'];
            uri = uri.replace("\\?", "?");
            if (uri.startsWith("\"")) {
                uri = uri.last(uri.length - 1);
            }
            if (uri.endsWith("\"")) {
                uri = uri.first(uri.length - 1);
            }
            return uri;
        }
        else {
            return null;
        }
    }
    Camel.getSelectedEndpointName = getSelectedEndpointName;
    /**
     * Escapes the given URI text so it can be used in a JMX name
     */
    function escapeEndpointUriNameForJmx(uri) {
        if (angular.isString(uri)) {
            var answer = uri.replace("?", "\\?");
            // lets ensure that we have a "//" after each ":"
            answer = answer.replace(/\:(\/[^\/])/, "://$1");
            answer = answer.replace(/\:([^\/])/, "://$1");
            return answer;
        }
        else {
            return uri;
        }
    }
    Camel.escapeEndpointUriNameForJmx = escapeEndpointUriNameForJmx;
    /**
     * Returns the mbean for the currently selected camel context and the name of the currently
     * selected endpoint for JMX operations on a context that require an endpoint name.
     * @method
     * @param workspace
     * @return {{uri: string, mbean: string}} either value could be null if there's a parse failure
     */
    function getContextAndTargetEndpoint(workspace) {
        return {
            uri: Camel.getSelectedEndpointName(workspace),
            mbean: Camel.getSelectionCamelContextMBean(workspace)
        };
    }
    Camel.getContextAndTargetEndpoint = getContextAndTargetEndpoint;
    /**
     * Returns the cached Camel XML route node stored in the current tree selection Folder
     * @method
     */
    function getSelectedRouteNode(workspace) {
        var selection = workspace.selection;
        return (selection && Camel.jmxDomain === selection.domain) ? selection["routeXmlNode"] : null;
    }
    Camel.getSelectedRouteNode = getSelectedRouteNode;
    /**
     * Flushes the cached Camel XML route node stored in the selected tree Folder
     * @method
     * @param workspace
     */
    function clearSelectedRouteNode(workspace) {
        var selection = workspace.selection;
        if (selection && Camel.jmxDomain === selection.domain) {
            delete selection["routeXmlNode"];
        }
    }
    Camel.clearSelectedRouteNode = clearSelectedRouteNode;
    /**
     * Looks up the given node name in the Camel schema
     * @method
     */
    function getCamelSchema(nodeIdOrDefinition) {
        return (angular.isObject(nodeIdOrDefinition)) ? nodeIdOrDefinition : Forms.lookupDefinition(nodeIdOrDefinition, _apacheCamelModel);
    }
    Camel.getCamelSchema = getCamelSchema;
    /**
     * Returns true if the given nodeId is a route, endpoint or pattern
     * (and not some nested type like a data format)
     * @method
     */
    function isCamelPattern(nodeId) {
        return Forms.isJsonType(nodeId, _apacheCamelModel, "org.apache.camel.model.OptionalIdentifiedDefinition");
    }
    Camel.isCamelPattern = isCamelPattern;
    /**
     * Returns true if the given node type prefers adding the next sibling as a child
     * @method
     */
    function isNextSiblingAddedAsChild(nodeIdOrDefinition) {
        var definition = getCamelSchema(nodeIdOrDefinition);
        if (definition) {
            return definition["nextSiblingAddedAsChild"] || false;
        }
        return null;
    }
    Camel.isNextSiblingAddedAsChild = isNextSiblingAddedAsChild;
    function acceptInput(nodeIdOrDefinition) {
        var definition = getCamelSchema(nodeIdOrDefinition);
        if (definition) {
            return definition["acceptInput"] || false;
        }
        return null;
    }
    Camel.acceptInput = acceptInput;
    function acceptOutput(nodeIdOrDefinition) {
        var definition = getCamelSchema(nodeIdOrDefinition);
        if (definition) {
            return definition["acceptOutput"] || false;
        }
        return null;
    }
    Camel.acceptOutput = acceptOutput;
    /**
     * Looks up the Camel language settings for the given language name
     * @method
     */
    function camelLanguageSettings(nodeName) {
        return _apacheCamelModel.languages[nodeName];
    }
    Camel.camelLanguageSettings = camelLanguageSettings;
    function isCamelLanguage(nodeName) {
        return (camelLanguageSettings(nodeName) || nodeName === "expression") ? true : false;
    }
    Camel.isCamelLanguage = isCamelLanguage;
    /**
     * Converts the XML string or DOM node to a camel tree
     * @method
     */
    function loadCamelTree(xml, key) {
        var doc = xml;
        if (angular.isString(xml)) {
            doc = $.parseXML(xml);
        }
        // TODO get id from camelContext
        var id = "camelContext";
        var folder = new Folder(id);
        folder.addClass = "org-apache-camel-context";
        folder.domain = Camel.jmxDomain;
        folder.typeName = "context";
        folder.key = Core.toSafeDomID(key);
        var context = $(doc).find("camelContext");
        if (!context || !context.length) {
            context = $(doc).find("routes");
        }
        if (context && context.length) {
            folder["xmlDocument"] = doc;
            folder["routeXmlNode"] = context;
            $(context).children("route").each(function (idx, route) {
                var id = route.getAttribute("id");
                if (!id) {
                    id = "route" + idx;
                    route.setAttribute("id", id);
                }
                var routeFolder = new Folder(id);
                routeFolder.addClass = "org-apache-camel-route";
                routeFolder.typeName = "routes";
                routeFolder.domain = Camel.jmxDomain;
                routeFolder.key = folder.key + "_" + Core.toSafeDomID(id);
                routeFolder.parent = folder;
                var nodeSettings = getCamelSchema("route");
                if (nodeSettings) {
                    var imageUrl = getRouteNodeIcon(nodeSettings);
                    routeFolder.tooltip = nodeSettings["tooltip"] || nodeSettings["description"] || id;
                    routeFolder.icon = imageUrl;
                }
                folder.children.push(routeFolder);
                addRouteChildren(routeFolder, route);
            });
        }
        return folder;
    }
    Camel.loadCamelTree = loadCamelTree;
    /**
     * Adds the route children to the given folder for each step in the route
     * @method
     */
    function addRouteChildren(folder, route) {
        folder.children = [];
        folder["routeXmlNode"] = route;
        route.setAttribute("_cid", folder.key);
        $(route).children("*").each(function (idx, n) {
            addRouteChild(folder, n);
        });
    }
    Camel.addRouteChildren = addRouteChildren;
    /**
     * Adds a child to the given folder / route
     * @method
     */
    function addRouteChild(folder, n) {
        var nodeName = n.localName;
        if (nodeName) {
            var nodeSettings = getCamelSchema(nodeName);
            if (nodeSettings) {
                var imageUrl = getRouteNodeIcon(nodeSettings);
                var child = new Folder(nodeName);
                child.domain = Camel.jmxDomain;
                child.typeName = "routeNode";
                updateRouteNodeLabelAndTooltip(child, n, nodeSettings);
                // TODO should maybe auto-generate these?
                child.parent = folder;
                child.folderNames = folder.folderNames;
                var id = n.getAttribute("id") || nodeName;
                var key = folder.key + "_" + Core.toSafeDomID(id);
                // lets find the next key thats unique
                var counter = 1;
                var notFound = true;
                while (notFound) {
                    var tmpKey = key + counter;
                    if (folder.children.some({ key: tmpKey })) {
                        counter += 1;
                    }
                    else {
                        notFound = false;
                        key = tmpKey;
                    }
                }
                child.key = key;
                child.icon = imageUrl;
                child["routeXmlNode"] = n;
                if (!folder.children) {
                    folder.children = [];
                }
                folder.children.push(child);
                addRouteChildren(child, n);
                return child;
            }
        }
        return null;
    }
    Camel.addRouteChild = addRouteChild;
    /**
     * Returns the root JMX Folder of the camel mbeans
     */
    function getRootCamelFolder(workspace) {
        var tree = workspace ? workspace.tree : null;
        if (tree) {
            return tree.get(Camel.jmxDomain);
        }
        return null;
    }
    Camel.getRootCamelFolder = getRootCamelFolder;
    /**
     * Returns the JMX folder for the camel context
     */
    function getCamelContextFolder(workspace, camelContextId) {
        var answer = null;
        var root = getRootCamelFolder(workspace);
        if (root && camelContextId) {
            angular.forEach(root.children, function (contextFolder) {
                if (!answer && camelContextId === contextFolder.title) {
                    answer = contextFolder;
                }
            });
        }
        return answer;
    }
    Camel.getCamelContextFolder = getCamelContextFolder;
    /**
     * Returns the mbean for the given camel context ID or null if it cannot be found
     */
    function getCamelContextMBean(workspace, camelContextId) {
        var contextsFolder = getCamelContextFolder(workspace, camelContextId);
        if (contextsFolder) {
            var contextFolder = contextsFolder.navigate("context");
            if (contextFolder && contextFolder.children && contextFolder.children.length) {
                var contextItem = contextFolder.children[0];
                return contextItem.objectName;
            }
        }
        return null;
    }
    Camel.getCamelContextMBean = getCamelContextMBean;
    /**
     * Given a selection in the workspace try figure out the URL to the
     * full screen view
     */
    function linkToFullScreenView(workspace) {
        var answer = null;
        var selection = workspace.selection;
        if (selection) {
            var entries = selection.entries;
            if (entries) {
                var contextId = entries["context"];
                var name = entries["name"];
                var type = entries["type"];
                if ("endpoints" === type) {
                    return linkToBrowseEndpointFullScreen(contextId, name);
                }
                if ("routes" === type) {
                    return linkToRouteDiagramFullScreen(contextId, name);
                }
            }
        }
        return answer;
    }
    Camel.linkToFullScreenView = linkToFullScreenView;
    /**
     * Returns the link to browse the endpoint full screen
     */
    function linkToBrowseEndpointFullScreen(contextId, endpointPath) {
        var answer = null;
        if (contextId && endpointPath) {
            answer = "#/camel/endpoint/browse/" + contextId + "/" + endpointPath;
        }
        return answer;
    }
    Camel.linkToBrowseEndpointFullScreen = linkToBrowseEndpointFullScreen;
    /**
     * Returns the link to the route diagram full screen
     */
    function linkToRouteDiagramFullScreen(contextId, routeId) {
        var answer = null;
        if (contextId && routeId) {
            answer = "#/camel/route/diagram/" + contextId + "/" + routeId;
        }
        return answer;
    }
    Camel.linkToRouteDiagramFullScreen = linkToRouteDiagramFullScreen;
    function getFolderCamelNodeId(folder) {
        var answer = Core.pathGet(folder, ["routeXmlNode", "localName"]);
        return ("from" === answer || "to" === answer) ? "endpoint" : answer;
    }
    Camel.getFolderCamelNodeId = getFolderCamelNodeId;
    /**
     * Rebuilds the DOM tree from the tree node and performs all the various hacks
     * to turn the folder / JSON / model into valid camel XML
     * such as renaming language elements from <language expression="foo" language="bar/>
     * to <bar>foo</bar>
     * and changing <endpoint> into either <from> or <to>
     * @method
     * @param treeNode is either the Node from the tree widget (with the real Folder in the data property) or a Folder
     */
    function createFolderXmlTree(treeNode, xmlNode, indent) {
        if (indent === void 0) { indent = Camel.increaseIndent(""); }
        var folder = treeNode.data || treeNode;
        var count = 0;
        var parentName = getFolderCamelNodeId(folder);
        if (folder) {
            if (!xmlNode) {
                xmlNode = document.createElement(parentName);
                var rootJson = Camel.getRouteFolderJSON(folder);
                if (rootJson) {
                    Camel.setRouteNodeJSON(xmlNode, rootJson, indent);
                }
            }
            var doc = xmlNode.ownerDocument || document;
            var namespaceURI = xmlNode.namespaceURI;
            var from = parentName !== "route";
            var childIndent = Camel.increaseIndent(indent);
            angular.forEach(treeNode.children || treeNode.getChildren(), function (childTreeNode) {
                var childFolder = childTreeNode.data || childTreeNode;
                var name = Camel.getFolderCamelNodeId(childFolder);
                var json = Camel.getRouteFolderJSON(childFolder);
                if (name && json) {
                    var language = false;
                    if (name === "endpoint") {
                        if (from) {
                            name = "to";
                        }
                        else {
                            name = "from";
                            from = true;
                        }
                    }
                    if (name === "expression") {
                        var languageName = json["language"];
                        if (languageName) {
                            name = languageName;
                            language = true;
                        }
                    }
                    // lets create the XML
                    xmlNode.appendChild(doc.createTextNode("\n" + childIndent));
                    var newNode = doc.createElementNS(namespaceURI, name);
                    Camel.setRouteNodeJSON(newNode, json, childIndent);
                    xmlNode.appendChild(newNode);
                    count += 1;
                    createFolderXmlTree(childTreeNode, newNode, childIndent);
                }
            });
            if (count) {
                xmlNode.appendChild(doc.createTextNode("\n" + indent));
            }
        }
        return xmlNode;
    }
    Camel.createFolderXmlTree = createFolderXmlTree;
    function updateRouteNodeLabelAndTooltip(folder, routeXmlNode, nodeSettings) {
        var localName = routeXmlNode.localName;
        var id = routeXmlNode.getAttribute("id");
        var label = nodeSettings["title"] || localName;
        // lets use the ID for routes and other things we give an id
        var tooltip = nodeSettings["tooltip"] || nodeSettings["description"] || label;
        if (id) {
            label = id;
        }
        else {
            var uri = getRouteNodeUri(routeXmlNode);
            if (uri) {
                // Don't use from/to as it gets odd if you drag/drop and reorder
                // label += " " + uri;
                label = uri;
                var split = uri.split("?");
                if (split && split.length > 1) {
                    label = split[0];
                }
                tooltip += " " + uri;
            }
            else {
                var children = $(routeXmlNode).children("*");
                if (children && children.length) {
                    var child = children[0];
                    var childName = child.localName;
                    var expression = null;
                    if (Camel.isCamelLanguage(childName)) {
                        expression = child.textContent;
                        if (!expression) {
                            expression = child.getAttribute("expression");
                        }
                    }
                    if (expression) {
                        label += " " + expression;
                        tooltip += " " + childName + " expression";
                    }
                }
            }
        }
        folder.title = label;
        folder.tooltip = tooltip;
        return label;
    }
    Camel.updateRouteNodeLabelAndTooltip = updateRouteNodeLabelAndTooltip;
    /**
     * Returns the selected camel context mbean for the given selection or null if it cannot be found
     * @method
     */
    // TODO should be a service
    function getSelectionCamelContextMBean(workspace) {
        if (workspace) {
            var contextId = getContextId(workspace);
            var selection = workspace.selection;
            var tree = workspace.tree;
            if (tree && selection) {
                var domain = selection.domain;
                if (domain && contextId) {
                    var result = tree.navigate(domain, contextId, "context");
                    if (result && result.children) {
                        var contextBean = result.children.first();
                        if (contextBean.title) {
                            var contextName = contextBean.title;
                            return "" + domain + ":context=" + contextId + ',type=context,name="' + contextName + '"';
                        }
                    }
                }
            }
        }
        return null;
    }
    Camel.getSelectionCamelContextMBean = getSelectionCamelContextMBean;
    function getSelectionCamelContextEndpoints(workspace) {
        if (workspace) {
            var contextId = getContextId(workspace);
            var selection = workspace.selection;
            var tree = workspace.tree;
            if (tree && selection) {
                var domain = selection.domain;
                if (domain && contextId) {
                    return tree.navigate(domain, contextId, "endpoints");
                }
            }
        }
        return null;
    }
    Camel.getSelectionCamelContextEndpoints = getSelectionCamelContextEndpoints;
    /**
     * Returns the selected camel trace mbean for the given selection or null if it cannot be found
     * @method
     */
    // TODO Should be a service
    function getSelectionCamelTraceMBean(workspace) {
        if (workspace) {
            var contextId = getContextId(workspace);
            var selection = workspace.selection;
            var tree = workspace.tree;
            if (tree && selection) {
                var domain = selection.domain;
                if (domain && contextId) {
                    // look for the Camel 2.11 mbean which we prefer
                    var result = tree.navigate(domain, contextId, "tracer");
                    if (result && result.children) {
                        var mbean = result.children.find(function (m) { return m.title.startsWith("BacklogTracer"); });
                        if (mbean) {
                            return mbean.objectName;
                        }
                    }
                    // look for the fuse camel fabric mbean
                    var fabricResult = tree.navigate(domain, contextId, "fabric");
                    if (fabricResult && fabricResult.children) {
                        var mbean = fabricResult.children.first();
                        return mbean.objectName;
                    }
                }
            }
        }
        return null;
    }
    Camel.getSelectionCamelTraceMBean = getSelectionCamelTraceMBean;
    function getSelectionCamelDebugMBean(workspace) {
        if (workspace) {
            var contextId = getContextId(workspace);
            var selection = workspace.selection;
            var tree = workspace.tree;
            if (tree && selection) {
                var domain = selection.domain;
                if (domain && contextId) {
                    var result = tree.navigate(domain, contextId, "tracer");
                    if (result && result.children) {
                        var mbean = result.children.find(function (m) { return m.title.startsWith("BacklogDebugger"); });
                        if (mbean) {
                            return mbean.objectName;
                        }
                    }
                }
            }
        }
        return null;
    }
    Camel.getSelectionCamelDebugMBean = getSelectionCamelDebugMBean;
    function getSelectionCamelTypeConverter(workspace) {
        if (workspace) {
            var contextId = getContextId(workspace);
            var selection = workspace.selection;
            var tree = workspace.tree;
            if (tree && selection) {
                var domain = selection.domain;
                if (domain && contextId) {
                    var result = tree.navigate(domain, contextId, "services");
                    if (result && result.children) {
                        var mbean = result.children.find(function (m) { return m.title.startsWith("DefaultTypeConverter"); });
                        if (mbean) {
                            return mbean.objectName;
                        }
                    }
                }
            }
        }
        return null;
    }
    Camel.getSelectionCamelTypeConverter = getSelectionCamelTypeConverter;
    function getSelectionCamelRestRegistry(workspace) {
        if (workspace) {
            var contextId = getContextId(workspace);
            var selection = workspace.selection;
            var tree = workspace.tree;
            if (tree && selection) {
                var domain = selection.domain;
                if (domain && contextId) {
                    var result = tree.navigate(domain, contextId, "services");
                    if (result && result.children) {
                        var mbean = result.children.find(function (m) { return m.title.startsWith("DefaultRestRegistry"); });
                        if (mbean) {
                            return mbean.objectName;
                        }
                    }
                }
            }
        }
        return null;
    }
    Camel.getSelectionCamelRestRegistry = getSelectionCamelRestRegistry;
    function getSelectionCamelRouteMetrics(workspace) {
        if (workspace) {
            var contextId = getContextId(workspace);
            var selection = workspace.selection;
            var tree = workspace.tree;
            if (tree && selection) {
                var domain = selection.domain;
                if (domain && contextId) {
                    var result = tree.navigate(domain, contextId, "services");
                    if (result && result.children) {
                        var mbean = result.children.find(function (m) { return m.title.startsWith("MetricsRegistryService"); });
                        if (mbean) {
                            return mbean.objectName;
                        }
                    }
                }
            }
        }
        return null;
    }
    Camel.getSelectionCamelRouteMetrics = getSelectionCamelRouteMetrics;
    // TODO should be a service
    function getContextId(workspace) {
        var selection = workspace.selection;
        if (selection) {
            // find the camel context and find ancestors in the tree until we find the camel context selection
            // this is either if the title is 'context' or if the parent title is 'org.apache.camel' (the Camel tree is a bit special)
            selection = selection.findAncestor(function (s) { return s.title === 'context' || s.parent != null && s.parent.title === 'org.apache.camel'; });
            if (selection) {
                var tree = workspace.tree;
                var folderNames = selection.folderNames;
                var entries = selection.entries;
                var contextId;
                if (tree) {
                    if (folderNames && folderNames.length > 1) {
                        contextId = folderNames[1];
                    }
                    else if (entries) {
                        contextId = entries["context"];
                    }
                }
            }
        }
        return contextId;
    }
    Camel.getContextId = getContextId;
    /**
     * Returns true if the state of the item begins with the given state - or one of the given states
     * @method
     * @param item the item which has a State
     * @param state a value or an array of states
     */
    function isState(item, state) {
        var value = (item.State || "").toLowerCase();
        if (angular.isArray(state)) {
            return state.any(function (stateText) { return value.startsWith(stateText); });
        }
        else {
            return value.startsWith(state);
        }
    }
    Camel.isState = isState;
    function iconClass(state) {
        if (state) {
            switch (state.toLowerCase()) {
                case 'started':
                    return "green icon-play-circle";
                case 'suspended':
                    return "icon-pause";
            }
        }
        return "orange icon-off";
    }
    Camel.iconClass = iconClass;
    function getSelectedRouteId(workspace, folder) {
        if (folder === void 0) { folder = null; }
        var selection = folder || workspace.selection;
        var selectedRouteId = null;
        if (selection) {
            if (selection && selection.entries) {
                var typeName = selection.entries["type"];
                var name = selection.entries["name"];
                if ("routes" === typeName && name) {
                    selectedRouteId = Core.trimQuotes(name);
                }
            }
        }
        return selectedRouteId;
    }
    Camel.getSelectedRouteId = getSelectedRouteId;
    /**
     * Returns the selected camel route mbean for the given route id
     * @method
     */
    // TODO Should be a service
    function getSelectionRouteMBean(workspace, routeId) {
        if (workspace) {
            var contextId = getContextId(workspace);
            var selection = workspace.selection;
            var tree = workspace.tree;
            if (tree && selection) {
                var domain = selection.domain;
                if (domain && contextId) {
                    var result = tree.navigate(domain, contextId, "routes");
                    if (result && result.children) {
                        var mbean = result.children.find(function (m) { return m.title === routeId; });
                        if (mbean) {
                            return mbean.objectName;
                        }
                    }
                }
            }
        }
        return null;
    }
    Camel.getSelectionRouteMBean = getSelectionRouteMBean;
    function getCamelVersion(workspace, jolokia) {
        if (workspace) {
            var contextId = getContextId(workspace);
            var selection = workspace.selection;
            var tree = workspace.tree;
            if (tree && selection) {
                var domain = selection.domain;
                if (domain && contextId) {
                    var result = tree.navigate(domain, contextId, "context");
                    if (result && result.children) {
                        var contextBean = result.children.first();
                        if (contextBean.version) {
                            // read the cached version
                            return contextBean.version;
                        }
                        if (contextBean.title) {
                            // okay no version cached, so need to get the version using jolokia
                            var contextName = contextBean.title;
                            var mbean = "" + domain + ":context=" + contextId + ',type=context,name="' + contextName + '"';
                            // must use Core.onSuccess(null) that means sync as we need the version asap
                            var version = jolokia.getAttribute(mbean, "CamelVersion", Core.onSuccess(null));
                            // cache version so we do not need to read it again using jolokia
                            contextBean.version = version;
                            return version;
                        }
                    }
                }
            }
        }
        return null;
    }
    Camel.getCamelVersion = getCamelVersion;
    function createMessageFromXml(exchange) {
        var exchangeElement = $(exchange);
        var uid = exchangeElement.children("uid").text();
        var timestamp = exchangeElement.children("timestamp").text();
        var messageData = {
            headers: {},
            headerTypes: {},
            id: null,
            uid: uid,
            timestamp: timestamp,
            headerHtml: ""
        };
        var message = exchangeElement.children("message")[0];
        if (!message) {
            message = exchange;
        }
        var messageElement = $(message);
        var headers = messageElement.find("header");
        var headerHtml = "";
        headers.each(function (idx, header) {
            var key = header.getAttribute("key");
            var typeName = header.getAttribute("type");
            var value = header.textContent;
            if (key) {
                if (value)
                    messageData.headers[key] = value;
                if (typeName)
                    messageData.headerTypes[key] = typeName;
                headerHtml += "<tr><td class='property-name'>" + key + "</td>" + "<td class='property-value'>" + (humanizeJavaType(typeName)) + "</td>" + "<td class='property-value'>" + (value || "") + "</td></tr>";
            }
        });
        messageData.headerHtml = headerHtml;
        var id = messageData.headers["breadcrumbId"];
        if (!id) {
            var postFixes = ["MessageID", "ID", "Path", "Name"];
            angular.forEach(postFixes, function (postfix) {
                if (!id) {
                    angular.forEach(messageData.headers, function (value, key) {
                        if (!id && key.endsWith(postfix)) {
                            id = value;
                        }
                    });
                }
            });
            // lets find the first header with a name or Path in it
            // if still no value, lets use the first :)
            angular.forEach(messageData.headers, function (value, key) {
                if (!id)
                    id = value;
            });
        }
        messageData.id = id;
        var body = messageElement.children("body")[0];
        if (body) {
            var bodyText = body.textContent;
            var bodyType = body.getAttribute("type");
            messageData["body"] = bodyText;
            messageData["bodyType"] = humanizeJavaType(bodyType);
        }
        return messageData;
    }
    Camel.createMessageFromXml = createMessageFromXml;
    function humanizeJavaType(type) {
        if (!type) {
            return "";
        }
        // skip leading java.lang
        if (type.startsWith("java.lang")) {
            return type.substr(10);
        }
        return type;
    }
    Camel.humanizeJavaType = humanizeJavaType;
    function createBrowseGridOptions() {
        return {
            selectedItems: [],
            data: 'messages',
            displayFooter: false,
            showFilter: false,
            showColumnMenu: true,
            enableColumnResize: true,
            enableColumnReordering: true,
            filterOptions: {
                filterText: ''
            },
            selectWithCheckboxOnly: true,
            showSelectionCheckbox: true,
            maintainColumnRatios: false,
            columnDefs: [
                {
                    field: 'id',
                    displayName: 'ID',
                    // for ng-grid
                    //width: '50%',
                    // for hawtio-datatable
                    // width: "22em",
                    cellTemplate: '<div class="ngCellText"><a ng-click="openMessageDialog(row)">{{row.entity.id}}</a></div>'
                }
            ]
        };
    }
    Camel.createBrowseGridOptions = createBrowseGridOptions;
    function loadRouteXmlNodes($scope, doc, selectedRouteId, nodes, links, width) {
        var allRoutes = $(doc).find("route");
        var routeDelta = width / allRoutes.length;
        var rowX = 0;
        allRoutes.each(function (idx, route) {
            var routeId = route.getAttribute("id");
            if (!selectedRouteId || !routeId || selectedRouteId === routeId) {
                Camel.addRouteXmlChildren($scope, route, nodes, links, null, rowX, 0);
                rowX += routeDelta;
            }
        });
    }
    Camel.loadRouteXmlNodes = loadRouteXmlNodes;
    function addRouteXmlChildren($scope, parent, nodes, links, parentId, parentX, parentY, parentNode) {
        if (parentNode === void 0) { parentNode = null; }
        var delta = 150;
        var x = parentX;
        var y = parentY + delta;
        var rid = parent.getAttribute("id");
        var siblingNodes = [];
        var parenNodeName = parent.localName;
        $(parent).children().each(function (idx, route) {
            var id = nodes.length;
            // from acts as a parent even though its a previous sibling :)
            var nodeId = route.localName;
            if (nodeId === "from" && !parentId) {
                parentId = id;
            }
            var nodeSettings = getCamelSchema(nodeId);
            var node = null;
            if (nodeSettings) {
                var label = nodeSettings["title"] || nodeId;
                var uri = getRouteNodeUri(route);
                if (uri) {
                    label += " " + uri.split("?")[0];
                }
                var tooltip = nodeSettings["tooltip"] || nodeSettings["description"] || label;
                if (uri) {
                    tooltip += " " + uri;
                }
                var elementID = route.getAttribute("id");
                var labelSummary = label;
                if (elementID) {
                    var customId = route.getAttribute("customId");
                    if ($scope.camelIgnoreIdForLabel || (!customId || customId === "false")) {
                        labelSummary = "id: " + elementID;
                    }
                    else {
                        label = elementID;
                    }
                }
                // lets check if we need to trim the label
                var labelLimit = $scope.camelMaximumLabelWidth || Camel.defaultMaximumLabelWidth;
                var length = label.length;
                if (length > labelLimit) {
                    labelSummary = label + "\n\n" + labelSummary;
                    label = label.substring(0, labelLimit) + "..";
                }
                var imageUrl = getRouteNodeIcon(nodeSettings);
                if ((nodeId === "from" || nodeId === "to") && uri) {
                    var uriIdx = uri.indexOf(":");
                    if (uriIdx > 0) {
                        var componentScheme = uri.substring(0, uriIdx);
                        //console.log("lets find the endpoint icon for " + componentScheme);
                        if (componentScheme) {
                            var value = Camel.getEndpointIcon(componentScheme);
                            if (value) {
                                imageUrl = Core.url(value);
                            }
                        }
                    }
                }
                //console.log("Image URL is " + imageUrl);
                var cid = route.getAttribute("_cid") || route.getAttribute("id");
                node = { "name": name, "label": label, "labelSummary": labelSummary, "group": 1, "id": id, "elementId": elementID, "x": x, "y:": y, "imageUrl": imageUrl, "cid": cid, "tooltip": tooltip, "type": nodeId };
                if (rid) {
                    node["rid"] = rid;
                    if (!$scope.routeNodes)
                        $scope.routeNodes = {};
                    $scope.routeNodes[rid] = node;
                }
                if (!cid) {
                    cid = nodeId + (nodes.length + 1);
                }
                if (cid) {
                    node["cid"] = cid;
                    if (!$scope.nodes)
                        $scope.nodes = {};
                    $scope.nodes[cid] = node;
                }
                // only use the route id on the first from node
                rid = null;
                nodes.push(node);
                if (parentId !== null && parentId !== id) {
                    if (siblingNodes.length === 0 || parenNodeName === "choice") {
                        links.push({ "source": parentId, "target": id, "value": 1 });
                    }
                    else {
                        siblingNodes.forEach(function (nodeId) {
                            links.push({ "source": nodeId, "target": id, "value": 1 });
                        });
                        siblingNodes.length = 0;
                    }
                }
            }
            else {
                // ignore non EIP nodes, though we should add expressions...
                var langSettings = Camel.camelLanguageSettings(nodeId);
                if (langSettings && parentNode) {
                    // lets add the language kind
                    var name = langSettings["name"] || nodeId;
                    var text = route.textContent;
                    if (text) {
                        parentNode["tooltip"] = parentNode["label"] + " " + name + " " + text;
                        parentNode["label"] = text;
                    }
                    else {
                        parentNode["label"] = parentNode["label"] + " " + name;
                    }
                }
            }
            var siblings = addRouteXmlChildren($scope, route, nodes, links, id, x, y, node);
            if (parenNodeName === "choice") {
                siblingNodes = siblingNodes.concat(siblings);
                x += delta;
            }
            else if (nodeId === "choice") {
                siblingNodes = siblings;
                y += delta;
            }
            else {
                siblingNodes = [nodes.length - 1];
                y += delta;
            }
        });
        return siblingNodes;
    }
    Camel.addRouteXmlChildren = addRouteXmlChildren;
    function getCanvasHeight(canvasDiv) {
        var height = canvasDiv.height();
        if (height < 300) {
            console.log("browse thinks the height is only " + height + " so calculating offset from doc height");
            var offset = canvasDiv.offset();
            height = $(document).height() - 5;
            if (offset) {
                var top = offset['top'];
                if (top) {
                    height -= top;
                }
            }
        }
        return height;
    }
    Camel.getCanvasHeight = getCanvasHeight;
    /**
     * Recursively add all the folders which have a cid value into the given map
     * @method
     */
    function addFoldersToIndex(folder, map) {
        if (map === void 0) { map = {}; }
        if (folder) {
            var key = folder.key;
            if (key) {
                map[key] = folder;
            }
            angular.forEach(folder.children, function (child) { return addFoldersToIndex(child, map); });
        }
        return map;
    }
    Camel.addFoldersToIndex = addFoldersToIndex;
    /**
     * Re-generates the XML document using the given Tree widget Node or Folder as the source
     * @method
     */
    function generateXmlFromFolder(treeNode) {
        var folder = (treeNode && treeNode.data) ? treeNode.data : treeNode;
        if (!folder)
            return null;
        var doc = folder["xmlDocument"];
        var context = folder["routeXmlNode"];
        if (context && context.length) {
            var element = context[0];
            var children = element.childNodes;
            var routeIndices = [];
            for (var i = 0; i < children.length; i++) {
                var node = children[i];
                var name = node.localName;
                if ("route" === name && parent) {
                    routeIndices.push(i);
                }
            }
            while (routeIndices.length) {
                var idx = routeIndices.pop();
                var nextIndex = idx + 1;
                while (true) {
                    var node = element.childNodes[nextIndex];
                    if (Core.isTextNode(node)) {
                        element.removeChild(node);
                    }
                    else {
                        break;
                    }
                }
                if (idx < element.childNodes.length) {
                    element.removeChild(element.childNodes[idx]);
                }
                for (var i = idx - 1; i >= 0; i--) {
                    var node = element.childNodes[i];
                    if (Core.isTextNode(node)) {
                        element.removeChild(node);
                    }
                    else {
                        break;
                    }
                }
            }
            Camel.createFolderXmlTree(treeNode, context[0]);
        }
        return doc;
    }
    Camel.generateXmlFromFolder = generateXmlFromFolder;
    /**
     * Returns an object of all the CamelContext MBeans keyed by their id
     * @method
     */
    function camelContextMBeansById(workspace) {
        var answer = {};
        var tree = workspace.tree;
        if (tree) {
            var camelTree = tree.navigate(Camel.jmxDomain);
            if (camelTree) {
                angular.forEach(camelTree.children, function (contextsFolder) {
                    var contextFolder = contextsFolder.navigate("context");
                    if (contextFolder && contextFolder.children && contextFolder.children.length) {
                        var contextItem = contextFolder.children[0];
                        var id = Core.pathGet(contextItem, ["entries", "name"]) || contextItem.key;
                        if (id) {
                            answer[id] = {
                                folder: contextItem,
                                mbean: contextItem.objectName
                            };
                        }
                    }
                });
            }
        }
        return answer;
    }
    Camel.camelContextMBeansById = camelContextMBeansById;
    /**
     * Returns an object of all the CamelContext MBeans keyed by the component name
     * @method
     */
    function camelContextMBeansByComponentName(workspace) {
        return camelContextMBeansByRouteOrComponentId(workspace, "components");
    }
    Camel.camelContextMBeansByComponentName = camelContextMBeansByComponentName;
    /**
     * Returns an object of all the CamelContext MBeans keyed by the route ID
     * @method
     */
    function camelContextMBeansByRouteId(workspace) {
        return camelContextMBeansByRouteOrComponentId(workspace, "routes");
    }
    Camel.camelContextMBeansByRouteId = camelContextMBeansByRouteId;
    function camelContextMBeansByRouteOrComponentId(workspace, componentsOrRoutes) {
        var answer = {};
        var tree = workspace.tree;
        if (tree) {
            var camelTree = tree.navigate(Camel.jmxDomain);
            if (camelTree) {
                angular.forEach(camelTree.children, function (contextsFolder) {
                    var contextFolder = contextsFolder.navigate("context");
                    var componentsFolder = contextsFolder.navigate(componentsOrRoutes);
                    if (contextFolder && componentsFolder && contextFolder.children && contextFolder.children.length) {
                        var contextItem = contextFolder.children[0];
                        var mbean = contextItem.objectName;
                        if (mbean) {
                            var contextValues = {
                                folder: contextItem,
                                mbean: mbean
                            };
                            angular.forEach(componentsFolder.children, function (componentFolder) {
                                var id = componentFolder.title;
                                if (id) {
                                    answer[id] = contextValues;
                                }
                            });
                        }
                    }
                });
            }
        }
        return answer;
    }
    /**
     * Returns an object for the given processor from the Camel tree
     * @method
     */
    function camelProcessorMBeansById(workspace) {
        var answer = {};
        var tree = workspace.tree;
        if (tree) {
            var camelTree = tree.navigate(Camel.jmxDomain);
            if (camelTree) {
                angular.forEach(camelTree.children, function (contextsFolder) {
                    var processorsFolder = contextsFolder.navigate("processors");
                    if (processorsFolder && processorsFolder.children && processorsFolder.children.length) {
                        angular.forEach(processorsFolder.children, function (processorFolder) {
                            var id = processorFolder.title;
                            if (id) {
                                var processorValues = {
                                    folder: processorsFolder,
                                    key: processorFolder.key
                                };
                                answer[id] = processorValues;
                            }
                        });
                    }
                });
            }
        }
        return answer;
    }
    Camel.camelProcessorMBeansById = camelProcessorMBeansById;
    /**
     * Returns true if we should ignore ID values for labels in camel diagrams
     * @method
     */
    function ignoreIdForLabel(localStorage) {
        var value = localStorage["camelIgnoreIdForLabel"];
        return Core.parseBooleanValue(value);
    }
    Camel.ignoreIdForLabel = ignoreIdForLabel;
    /**
     * Returns the maximum width of a label before we start to truncate
     * @method
     */
    function maximumLabelWidth(localStorage) {
        var value = localStorage["camelMaximumLabelWidth"];
        if (angular.isString(value)) {
            value = parseInt(value);
        }
        if (!value) {
            value = Camel.defaultMaximumLabelWidth;
        }
        return value;
    }
    Camel.maximumLabelWidth = maximumLabelWidth;
    /**
     * Returns the max body length for tracer and debugger
     * @method
     */
    function maximumTraceOrDebugBodyLength(localStorage) {
        var value = localStorage["camelMaximumTraceOrDebugBodyLength"];
        if (angular.isString(value)) {
            value = parseInt(value);
        }
        if (!value) {
            value = Camel.defaultCamelMaximumTraceOrDebugBodyLength;
        }
        return value;
    }
    Camel.maximumTraceOrDebugBodyLength = maximumTraceOrDebugBodyLength;
    /**
     * Returns whether to include streams body for tracer and debugger
     * @method
     */
    function traceOrDebugIncludeStreams(localStorage) {
        var value = localStorage["camelTraceOrDebugIncludeStreams"];
        return Core.parseBooleanValue(value, Camel.defaultCamelTraceOrDebugIncludeStreams);
    }
    Camel.traceOrDebugIncludeStreams = traceOrDebugIncludeStreams;
    /**
     * Returns the max value for seconds in the route metrics UI
     * @method
     */
    function routeMetricMaxSeconds(localStorage) {
        var value = localStorage["camelRouteMetricMaxSeconds"];
        if (angular.isString(value)) {
            value = parseInt(value);
        }
        if (!value) {
            value = Camel.defaultCamelRouteMetricMaxSeconds;
        }
        return value;
    }
    Camel.routeMetricMaxSeconds = routeMetricMaxSeconds;
    /**
     * Function to highlight the selected toNode in the nodes graph
     *
     * @param nodes the nodes
     * @param toNode the node to highlight
     */
    function highlightSelectedNode(nodes, toNode) {
        // lets clear the selected node first
        nodes.attr("class", "node");
        nodes.filter(function (item) {
            if (item) {
                var cid = item["cid"];
                var rid = item["rid"];
                var type = item["type"];
                var elementId = item["elementId"];
                // if its from then match on rid
                if ("from" === type) {
                    return toNode === rid;
                }
                // okay favor using element id as the cids can become
                // undefined or mangled with mbean object names, causing this to not work
                // where as elementId when present works fine
                if (elementId) {
                    // we should match elementId if defined
                    return toNode === elementId;
                }
                // then fallback to cid
                if (cid) {
                    return toNode === cid;
                }
                else {
                    // and last rid
                    return toNode === rid;
                }
            }
            return null;
        }).attr("class", "node selected");
    }
    Camel.highlightSelectedNode = highlightSelectedNode;
    /**
     * Is the currently selected Camel version equal or greater than
     *
     * @param major   major version as number
     * @param minor   minor version as number
     */
    function isCamelVersionEQGT(major, minor, workspace, jolokia) {
        var camelVersion = getCamelVersion(workspace, jolokia);
        if (camelVersion) {
            console.log("Camel version " + camelVersion);
            camelVersion += "camel-";
            var numbers = Core.parseVersionNumbers(camelVersion);
            if (Core.compareVersionNumberArrays(numbers, [major, minor]) >= 0) {
                return true;
            }
            else {
                return false;
            }
        }
        return false;
    }
    Camel.isCamelVersionEQGT = isCamelVersionEQGT;
})(Camel || (Camel = {}));

/// <reference path="../../includes.ts"/>
/// <reference path="camelHelpers.ts"/>
/**
 *
 * @module Camel
 * @main Camel
 */
var Camel;
(function (Camel) {
    var jmxModule = Jmx;
    Camel.pluginName = 'camel';
    var routeToolBar = "app/camel/html/attributeToolBarRoutes.html";
    var contextToolBar = "app/camel/html/attributeToolBarContext.html";
    Camel._module = angular.module(Camel.pluginName, ['bootstrap', 'ui.bootstrap', 'ui.bootstrap.dialog', 'ui.bootstrap.tabs', 'ui.bootstrap.typeahead', 'ngResource', 'hawtioCore', 'hawtio-ui']);
    Camel._module.config(["$routeProvider", function ($routeProvider) {
        $routeProvider.when('/camel/browseEndpoint', { templateUrl: 'app/camel/html/browseEndpoint.html' }).when('/camel/endpoint/browse/:contextId/*endpointPath', { templateUrl: 'app/camel/html/browseEndpoint.html' }).when('/camel/createEndpoint', { templateUrl: 'app/camel/html/createEndpoint.html' }).when('/camel/route/diagram/:contextId/:routeId', { templateUrl: 'app/camel/html/routes.html' }).when('/camel/routes', { templateUrl: 'app/camel/html/routes.html' }).when('/camel/fabricDiagram', { templateUrl: 'app/camel/html/fabricDiagram.html', reloadOnSearch: false }).when('/camel/typeConverter', { templateUrl: 'app/camel/html/typeConverter.html', reloadOnSearch: false }).when('/camel/restRegistry', { templateUrl: 'app/camel/html/restRegistry.html', reloadOnSearch: false }).when('/camel/routeMetrics', { templateUrl: 'app/camel/html/routeMetrics.html', reloadOnSearch: false }).when('/camel/sendMessage', { templateUrl: 'app/camel/html/sendMessage.html', reloadOnSearch: false }).when('/camel/source', { templateUrl: 'app/camel/html/source.html' }).when('/camel/traceRoute', { templateUrl: 'app/camel/html/traceRoute.html' }).when('/camel/debugRoute', { templateUrl: 'app/camel/html/debug.html' }).when('/camel/profileRoute', { templateUrl: 'app/camel/html/profileRoute.html' }).when('/camel/properties', { templateUrl: 'app/camel/html/properties.html' });
    }]);
    Camel._module.factory('tracerStatus', function () {
        return {
            jhandle: null,
            messages: []
        };
    });
    Camel._module.filter('camelIconClass', function () { return Camel.iconClass; });
    Camel._module.factory('activeMQMessage', function () {
        return { 'message': null };
    });
    Camel._module.run(["workspace", "jolokia", "viewRegistry", "layoutFull", "helpRegistry", "preferencesRegistry", function (workspace, jolokia, viewRegistry, layoutFull, helpRegistry, preferencesRegistry) {
        viewRegistry['camel/endpoint/'] = layoutFull;
        viewRegistry['camel/route/'] = layoutFull;
        viewRegistry['camel/fabricDiagram'] = layoutFull;
        viewRegistry['camel'] = 'app/camel/html/layoutCamelTree.html';
        helpRegistry.addUserDoc('camel', 'app/camel/doc/help.md', function () {
            return workspace.treeContainsDomainAndProperties(Camel.jmxDomain);
        });
        preferencesRegistry.addTab('Camel', 'app/camel/html/preferences.html', function () {
            return workspace.treeContainsDomainAndProperties(Camel.jmxDomain);
        });
        // TODO should really do this via a service that the JMX plugin exposes
        Jmx.addAttributeToolBar(Camel.pluginName, Camel.jmxDomain, function (selection) {
            // TODO there should be a nicer way to do this!
            var typeName = selection.typeName;
            if (typeName) {
                if (typeName.startsWith("context"))
                    return contextToolBar;
                if (typeName.startsWith("route"))
                    return routeToolBar;
            }
            var folderNames = selection.folderNames;
            if (folderNames && selection.domain === Camel.jmxDomain) {
                var last = folderNames.last();
                if ("routes" === last)
                    return routeToolBar;
                if ("context" === last)
                    return contextToolBar;
            }
            return null;
        });
        // register default attribute views
        var stateField = 'State';
        var stateTemplate = '<div class="ngCellText pagination-centered" title="{{row.getProperty(col.field)}}"><i class="{{row.getProperty(\'' + stateField + '\') | camelIconClass}}"></i></div>';
        var stateColumn = { field: stateField, displayName: stateField, cellTemplate: stateTemplate, width: 56, minWidth: 56, maxWidth: 56, resizable: false, defaultSort: false };
        var attributes = workspace.attributeColumnDefs;
        attributes[Camel.jmxDomain + "/context/folder"] = [
            stateColumn,
            { field: 'CamelId', displayName: 'Context' },
            { field: 'Uptime', displayName: 'Uptime', visible: false },
            { field: 'CamelVersion', displayName: 'Version', visible: false },
            { field: 'ExchangesCompleted', displayName: 'Completed #' },
            { field: 'ExchangesFailed', displayName: 'Failed #' },
            { field: 'FailuresHandled', displayName: 'Failed Handled #' },
            { field: 'ExchangesTotal', displayName: 'Total #', visible: false },
            { field: 'InflightExchanges', displayName: 'Inflight #' },
            { field: 'MeanProcessingTime', displayName: 'Mean Time' },
            { field: 'MinProcessingTime', displayName: 'Min Time' },
            { field: 'MaxProcessingTime', displayName: 'Max Time' },
            { field: 'TotalProcessingTime', displayName: 'Total Time', visible: false },
            { field: 'LastProcessingTime', displayName: 'Last Time', visible: false },
            { field: 'LastExchangeCompletedTimestamp', displayName: 'Last completed', visible: false },
            { field: 'LastExchangeFailedTimestamp', displayName: 'Last failed', visible: false },
            { field: 'Redeliveries', displayName: 'Redelivery #', visible: false },
            { field: 'ExternalRedeliveries', displayName: 'External Redelivery #', visible: false }
        ];
        attributes[Camel.jmxDomain + "/routes/folder"] = [
            stateColumn,
            { field: 'CamelId', displayName: 'Context' },
            { field: 'RouteId', displayName: 'Route' },
            { field: 'ExchangesCompleted', displayName: 'Completed #' },
            { field: 'ExchangesFailed', displayName: 'Failed #' },
            { field: 'FailuresHandled', displayName: 'Failed Handled #' },
            { field: 'ExchangesTotal', displayName: 'Total #', visible: false },
            { field: 'InflightExchanges', displayName: 'Inflight #' },
            { field: 'MeanProcessingTime', displayName: 'Mean Time' },
            { field: 'MinProcessingTime', displayName: 'Min Time' },
            { field: 'MaxProcessingTime', displayName: 'Max Time' },
            { field: 'TotalProcessingTime', displayName: 'Total Time', visible: false },
            { field: 'DeltaProcessingTime', displayName: 'Delta Time', visible: false },
            { field: 'LastProcessingTime', displayName: 'Last Time', visible: false },
            { field: 'LastExchangeCompletedTimestamp', displayName: 'Last completed', visible: false },
            { field: 'LastExchangeFailedTimestamp', displayName: 'Last failed', visible: false },
            { field: 'Redeliveries', displayName: 'Redelivery #', visible: false },
            { field: 'ExternalRedeliveries', displayName: 'External Redelivery #', visible: false }
        ];
        attributes[Camel.jmxDomain + "/processors/folder"] = [
            stateColumn,
            { field: 'CamelId', displayName: 'Context' },
            { field: 'RouteId', displayName: 'Route' },
            { field: 'ProcessorId', displayName: 'Processor' },
            { field: 'ExchangesCompleted', displayName: 'Completed #' },
            { field: 'ExchangesFailed', displayName: 'Failed #' },
            { field: 'FailuresHandled', displayName: 'Failed Handled #' },
            { field: 'ExchangesTotal', displayName: 'Total #', visible: false },
            { field: 'InflightExchanges', displayName: 'Inflight #' },
            { field: 'MeanProcessingTime', displayName: 'Mean Time' },
            { field: 'MinProcessingTime', displayName: 'Min Time' },
            { field: 'MaxProcessingTime', displayName: 'Max Time' },
            { field: 'TotalProcessingTime', displayName: 'Total Time', visible: false },
            { field: 'LastProcessingTime', displayName: 'Last Time', visible: false },
            { field: 'LastExchangeCompletedTimestamp', displayName: 'Last completed', visible: false },
            { field: 'LastExchangeFailedTimestamp', displayName: 'Last failed', visible: false },
            { field: 'Redeliveries', displayName: 'Redelivery #', visible: false },
            { field: 'ExternalRedeliveries', displayName: 'External Redelivery #', visible: false }
        ];
        attributes[Camel.jmxDomain + "/components/folder"] = [
            stateColumn,
            { field: 'CamelId', displayName: 'Context' },
            { field: 'ComponentName', displayName: 'Name' }
        ];
        attributes[Camel.jmxDomain + "/consumers/folder"] = [
            stateColumn,
            { field: 'CamelId', displayName: 'Context' },
            { field: 'RouteId', displayName: 'Route' },
            { field: 'EndpointUri', displayName: 'Endpoint URI', width: "**" },
            { field: 'Suspended', displayName: 'Suspended', resizable: false },
            { field: 'InflightExchanges', displayName: 'Inflight #' }
        ];
        attributes[Camel.jmxDomain + "/services/folder"] = [
            stateColumn,
            { field: 'CamelId', displayName: 'Context' },
            { field: 'RouteId', displayName: 'Route' },
            { field: 'Suspended', displayName: 'Suspended', resizable: false },
            { field: 'SupportsSuspended', displayName: 'Can Suspend', resizable: false }
        ];
        attributes[Camel.jmxDomain + "/endpoints/folder"] = [
            stateColumn,
            { field: 'CamelId', displayName: 'Context' },
            { field: 'EndpointUri', displayName: 'Endpoint URI', width: "***" },
            { field: 'Singleton', displayName: 'Singleton', resizable: false }
        ];
        attributes[Camel.jmxDomain + "/threadpools/folder"] = [
            { field: 'Id', displayName: 'Id', width: "**" },
            { field: 'ActiveCount', displayName: 'Active #' },
            { field: 'PoolSize', displayName: 'Pool Size' },
            { field: 'CorePoolSize', displayName: 'Core Pool Size' },
            { field: 'TaskQueueSize', displayName: 'Task Queue Size' },
            { field: 'TaskCount', displayName: 'Task #' },
            { field: 'CompletedTaskCount', displayName: 'Completed Task #' }
        ];
        attributes[Camel.jmxDomain + "/errorhandlers/folder"] = [
            { field: 'CamelId', displayName: 'Context' },
            { field: 'DeadLetterChannel', displayName: 'Dead Letter' },
            { field: 'DeadLetterChannelEndpointUri', displayName: 'Endpoint URI', width: "**", resizable: true },
            { field: 'MaximumRedeliveries', displayName: 'Max Redeliveries' },
            { field: 'RedeliveryDelay', displayName: 'Redelivery Delay' },
            { field: 'MaximumRedeliveryDelay', displayName: 'Max Redeliveries Delay' }
        ];
        workspace.topLevelTabs.push({
            id: "camel",
            content: "Camel",
            title: "Manage your Apache Camel applications",
            isValid: function (workspace) { return workspace.treeContainsDomainAndProperties(Camel.jmxDomain); },
            href: function () { return "#/jmx/attributes?tab=camel"; },
            isActive: function (workspace) { return workspace.isTopTabActive("camel"); }
        });
        // add sub level tabs
        // special for route diagram as we want this to be the 1st
        workspace.subLevelTabs.push({
            content: '<i class="icon-picture"></i> Route Diagram',
            title: "View a diagram of the Camel routes",
            isValid: function (workspace) { return workspace.isRoute() && workspace.hasInvokeRightsForName(Camel.getSelectionCamelContextMBean(workspace), "dumpRoutesAsXml"); },
            href: function () { return "#/camel/routes"; },
            // make sure we have route diagram shown first
            index: -2
        });
        workspace.subLevelTabs.push({
            content: '<i class="icon-bar-chart"></i> Route Metrics',
            title: "View the entire JVMs Camel route metrics",
            isValid: function (workspace) { return !workspace.isEndpointsFolder() && (workspace.isRoute() || workspace.isRoutesFolder() || workspace.isCamelContext()) && Camel.isCamelVersionEQGT(2, 14, workspace, jolokia) && workspace.hasInvokeRightsForName(Camel.getSelectionCamelRouteMetrics(workspace), "dumpStatisticsAsJson"); },
            href: function () { return "#/camel/routeMetrics"; }
        });
        workspace.subLevelTabs.push({
            content: '<i class=" icon-file-alt"></i> Source',
            title: "View the source of the Camel routes",
            isValid: function (workspace) { return !workspace.isEndpointsFolder() && (workspace.isRoute() || workspace.isRoutesFolder() || workspace.isCamelContext()) && workspace.hasInvokeRightsForName(Camel.getSelectionCamelContextMBean(workspace), "dumpRoutesAsXml"); },
            href: function () { return "#/camel/source"; }
        });
        workspace.subLevelTabs.push({
            content: '<i class=" icon-edit"></i> Properties',
            title: "View the pattern properties",
            isValid: function (workspace) { return Camel.getSelectedRouteNode(workspace); },
            href: function () { return "#/camel/properties"; }
        });
        workspace.subLevelTabs.push({
            content: '<i class="icon-list"></i> Type Converters',
            title: "List all the type converters registered in the context",
            isValid: function (workspace) { return workspace.isTopTabActive("camel") && !workspace.isEndpointsFolder() && !workspace.isRoute() && Camel.isCamelVersionEQGT(2, 13, workspace, jolokia) && workspace.hasInvokeRightsForName(Camel.getSelectionCamelTypeConverter(workspace), "listTypeConverters"); },
            href: function () { return "#/camel/typeConverter"; }
        });
        workspace.subLevelTabs.push({
            content: '<i class="icon-list"></i> Rest Services',
            title: "List all the REST services registered in the context",
            isValid: function (workspace) { return workspace.isTopTabActive("camel") && !workspace.isEndpointsFolder() && !workspace.isRoute() && Camel.isCamelVersionEQGT(2, 14, workspace, jolokia) && workspace.hasInvokeRightsForName(Camel.getSelectionCamelRestRegistry(workspace), "listRestServices"); },
            href: function () { return "#/camel/restRegistry"; }
        });
        workspace.subLevelTabs.push({
            content: '<i class="icon-envelope"></i> Browse',
            title: "Browse the messages on the endpoint",
            isValid: function (workspace) { return workspace.isEndpoint() && workspace.hasInvokeRights(workspace.selection, "browseAllMessagesAsXml"); },
            href: function () { return "#/camel/browseEndpoint"; }
        });
        workspace.subLevelTabs.push({
            content: '<i class="icon-stethoscope"></i> Debug',
            title: "Debug the Camel route",
            isValid: function (workspace) { return workspace.isRoute() && Camel.getSelectionCamelDebugMBean(workspace) && workspace.hasInvokeRightsForName(Camel.getSelectionCamelDebugMBean(workspace), "getBreakpoints"); },
            href: function () { return "#/camel/debugRoute"; }
        });
        workspace.subLevelTabs.push({
            content: '<i class="icon-envelope"></i> Trace',
            title: "Trace the messages flowing through the Camel route",
            isValid: function (workspace) { return workspace.isRoute() && Camel.getSelectionCamelTraceMBean(workspace) && workspace.hasInvokeRightsForName(Camel.getSelectionCamelTraceMBean(workspace), "dumpAllTracedMessagesAsXml"); },
            href: function () { return "#/camel/traceRoute"; }
        });
        workspace.subLevelTabs.push({
            content: '<i class="icon-bar-chart"></i> Profile',
            title: "Profile the messages flowing through the Camel route",
            isValid: function (workspace) { return workspace.isRoute() && Camel.getSelectionCamelTraceMBean(workspace) && workspace.hasInvokeRightsForName(Camel.getSelectionCamelTraceMBean(workspace), "dumpAllTracedMessagesAsXml"); },
            href: function () { return "#/camel/profileRoute"; }
        });
        workspace.subLevelTabs.push({
            content: '<i class="icon-pencil"></i> Send',
            title: "Send a message to this endpoint",
            isValid: function (workspace) { return workspace.isEndpoint() && workspace.hasInvokeRights(workspace.selection, workspace.selection.domain === "org.apache.camel" ? "sendBodyAndHeaders" : "sendTextMessage"); },
            href: function () { return "#/camel/sendMessage"; }
        });
        workspace.subLevelTabs.push({
            content: '<i class="icon-plus"></i> Endpoint',
            title: "Create a new endpoint",
            isValid: function (workspace) { return workspace.isEndpointsFolder() && workspace.hasInvokeRights(workspace.selection, "createEndpoint"); },
            href: function () { return "#/camel/createEndpoint"; }
        });
    }]);
    hawtioPluginLoader.addModule(Camel.pluginName);
    // register the jmx lazy loader here as it won't have been invoked in the run method
    hawtioPluginLoader.registerPreBootstrapTask(function (task) {
        jmxModule.registerLazyLoadHandler(Camel.jmxDomain, function (folder) {
            if (Camel.jmxDomain === folder.domain && "routes" === folder.typeName) {
                return function (workspace, folder, onComplete) {
                    if ("routes" === folder.typeName) {
                        Camel.processRouteXml(workspace, workspace.jolokia, folder, function (route) {
                            if (route) {
                                Camel.addRouteChildren(folder, route);
                            }
                            onComplete();
                        });
                    }
                    else {
                        onComplete();
                    }
                };
            }
            return null;
        });
        task();
    });
})(Camel || (Camel = {}));

/// <reference path="../../includes.ts"/>
/// <reference path="camelPlugin.ts"/>
var Camel;
(function (Camel) {
    Camel._module.controller("Camel.AttributesToolBarController", ["$scope", "workspace", "jolokia", function ($scope, workspace, jolokia) {
        $scope.deleteDialog = false;
        $scope.start = function () {
            $scope.invokeSelectedMBeans(function (item) {
                return Camel.isState(item, "suspend") ? "resume()" : "start()";
            });
        };
        $scope.pause = function () {
            $scope.invokeSelectedMBeans("suspend()");
        };
        $scope.stop = function () {
            $scope.invokeSelectedMBeans("stop()", function () {
                // lets navigate to the parent folder!
                // as this will be going way
                workspace.removeAndSelectParentNode();
            });
        };
        /*
         * Only for routes!
         */
        $scope.delete = function () {
            $scope.invokeSelectedMBeans("remove()", function () {
                // force a reload of the tree
                $scope.workspace.operationCounter += 1;
                Core.$apply($scope);
            });
        };
        $scope.anySelectionHasState = function (state) {
            var selected = $scope.selectedItems || [];
            return selected.length && selected.any(function (s) { return Camel.isState(s, state); });
        };
        $scope.everySelectionHasState = function (state) {
            var selected = $scope.selectedItems || [];
            return selected.length && selected.every(function (s) { return Camel.isState(s, state); });
        };
    }]);
})(Camel || (Camel = {}));

/// <reference path="../../includes.ts"/>
/// <reference path="camelPlugin.ts"/>
var Camel;
(function (Camel) {
    Camel._module.controller("Camel.BreadcrumbBarController", ["$scope", "$routeParams", "workspace", "jolokia", function ($scope, $routeParams, workspace, jolokia) {
        $scope.workspace = workspace;
        // if we are in dashboard then $routeParams may be null
        if ($routeParams != null) {
            $scope.contextId = $routeParams["contextId"];
            $scope.endpointPath = $routeParams["endpointPath"];
            $scope.endpointName = tidyJmxName($scope.endpointPath);
            $scope.routeId = $routeParams["routeId"];
        }
        $scope.treeViewLink = linkToTreeView();
        var defaultChildEntity = $scope.endpointPath ? "endpoints" : "routes";
        var childEntityToolTips = {
            "endpoints": "Camel Endpoint",
            "routes": "Camel Route"
        };
        /**
         * The array of breadcrumbs so that each item in the list of bookmarks can be switched for fast navigation and
         * we can easily render the navigation path
         */
        $scope.breadcrumbs = [
            {
                name: $scope.contextId,
                items: findContexts(),
                tooltip: "Camel Context"
            },
            {
                name: defaultChildEntity,
                items: findChildEntityTypes($scope.contextId),
                tooltip: "Entity inside a Camel Context"
            },
            {
                name: $scope.endpointName || tidyJmxName($scope.routeId),
                items: findChildEntityLinks($scope.contextId, currentChildEntity()),
                tooltip: childEntityToolTips[defaultChildEntity]
            }
        ];
        // lets find all the camel contexts
        function findContexts() {
            var answer = [];
            var rootFolder = Camel.getRootCamelFolder(workspace);
            if (rootFolder) {
                angular.forEach(rootFolder.children, function (contextFolder) {
                    var id = contextFolder.title;
                    if (id && id !== $scope.contextId) {
                        var name = id;
                        var link = createLinkToFirstChildEntity(id, currentChildEntity());
                        answer.push({
                            name: name,
                            tooltip: "Camel Context",
                            link: link
                        });
                    }
                });
            }
            return answer;
        }
        // lets find all the the child entities of a camel context
        function findChildEntityTypes(contextId) {
            var answer = [];
            angular.forEach(["endpoints", "routes"], function (childEntityName) {
                if (childEntityName && childEntityName !== currentChildEntity()) {
                    var link = createLinkToFirstChildEntity(contextId, childEntityName);
                    answer.push({
                        name: childEntityName,
                        tooltip: "Entity inside a Camel Context",
                        link: link
                    });
                }
            });
            return answer;
        }
        function currentChildEntity() {
            var answer = Core.pathGet($scope, ["breadcrumbs", "childEntity"]);
            return answer || defaultChildEntity;
        }
        /**
         * Based on the current child entity type, find the child links for the given context id and
         * generate a link to the first child; used when changing context or child entity type
         */
        function createLinkToFirstChildEntity(id, childEntityValue) {
            var links = findChildEntityLinks(id, childEntityValue);
            // TODO here we should switch to a default context view if there's no endpoints available...
            var link = links.length > 0 ? links[0].link : Camel.linkToBrowseEndpointFullScreen(id, "noEndpoints");
            return link;
        }
        function findChildEntityLinks(contextId, childEntityValue) {
            if ("endpoints" === childEntityValue) {
                return findEndpoints(contextId);
            }
            else {
                return findRoutes(contextId);
            }
        }
        // lets find all the endpoints for the given context id
        function findEndpoints(contextId) {
            var answer = [];
            var contextFolder = Camel.getCamelContextFolder(workspace, contextId);
            if (contextFolder) {
                var endpoints = (contextFolder["children"] || []).find(function (n) { return "endpoints" === n.title; });
                if (endpoints) {
                    angular.forEach(endpoints.children, function (endpointFolder) {
                        var entries = endpointFolder ? endpointFolder.entries : null;
                        if (entries) {
                            var endpointPath = entries["name"];
                            if (endpointPath) {
                                var name = tidyJmxName(endpointPath);
                                var link = Camel.linkToBrowseEndpointFullScreen(contextId, endpointPath);
                                answer.push({
                                    contextId: contextId,
                                    path: endpointPath,
                                    name: name,
                                    tooltip: "Endpoint",
                                    link: link
                                });
                            }
                        }
                    });
                }
            }
            return answer;
        }
        // lets find all the routes for the given context id
        function findRoutes(contextId) {
            var answer = [];
            var contextFolder = Camel.getCamelContextFolder(workspace, contextId);
            if (contextFolder) {
                var folders = (contextFolder["children"] || []).find(function (n) { return "routes" === n.title; });
                if (folders) {
                    angular.forEach(folders.children, function (folder) {
                        var entries = folder ? folder.entries : null;
                        if (entries) {
                            var routeId = entries["name"];
                            if (routeId) {
                                var name = tidyJmxName(routeId);
                                var link = Camel.linkToRouteDiagramFullScreen(contextId, routeId);
                                answer.push({
                                    contextId: contextId,
                                    path: routeId,
                                    name: name,
                                    tooltip: "Camel Route",
                                    link: link
                                });
                            }
                        }
                    });
                }
            }
            return answer;
        }
        /**
         * Creates a link to the tree view version of this view
         */
        function linkToTreeView() {
            var answer = null;
            if ($scope.contextId) {
                var node = null;
                var tab = null;
                if ($scope.endpointPath) {
                    tab = "browseEndpoint";
                    node = workspace.findMBeanWithProperties(Camel.jmxDomain, {
                        context: $scope.contextId,
                        type: "endpoints",
                        name: $scope.endpointPath
                    });
                }
                else if ($scope.routeId) {
                    tab = "routes";
                    node = workspace.findMBeanWithProperties(Camel.jmxDomain, {
                        context: $scope.contextId,
                        type: "routes",
                        name: $scope.routeId
                    });
                }
                var key = node ? node["key"] : null;
                if (key && tab) {
                    answer = "#/camel/" + tab + "?tab=camel&nid=" + key;
                }
            }
            return answer;
        }
        function tidyJmxName(jmxName) {
            return jmxName ? Core.trimQuotes(jmxName) : jmxName;
        }
    }]);
})(Camel || (Camel = {}));

/// <reference path="../../includes.ts"/>
/// <reference path="camelPlugin.ts"/>
var Camel;
(function (Camel) {
    Camel.BrowseEndpointController = Camel._module.controller("Camel.BrowseEndpointController", ["$scope", "$routeParams", "workspace", "jolokia", function ($scope, $routeParams, workspace, jolokia) {
        $scope.workspace = workspace;
        $scope.forwardDialog = new UI.Dialog();
        $scope.showMessageDetails = false;
        $scope.mode = 'text';
        $scope.gridOptions = Camel.createBrowseGridOptions();
        $scope.contextId = $routeParams["contextId"];
        $scope.endpointPath = $routeParams["endpointPath"];
        $scope.isJmxTab = !$routeParams["contextId"] || !$routeParams["endpointPath"];
        $scope.$watch('workspace.selection', function () {
            if ($scope.isJmxTab && workspace.moveIfViewInvalid())
                return;
            loadData();
        });
        // TODO can we share these 2 methods from activemq browse / camel browse / came trace?
        $scope.openMessageDialog = function (message) {
            ActiveMQ.selectCurrentMessage(message, "id", $scope);
            if ($scope.row) {
                $scope.mode = CodeEditor.detectTextFormat($scope.row.body);
                $scope.showMessageDetails = true;
            }
        };
        ActiveMQ.decorate($scope);
        $scope.forwardMessagesAndCloseForwardDialog = function () {
            var mbean = Camel.getSelectionCamelContextMBean(workspace);
            var selectedItems = $scope.gridOptions.selectedItems;
            var uri = $scope.endpointUri;
            if (mbean && uri && selectedItems && selectedItems.length) {
                //console.log("Creating a new endpoint called: " + uri + " just in case!");
                jolokia.execute(mbean, "createEndpoint(java.lang.String)", uri, Core.onSuccess(intermediateResult));
                $scope.message = "Forwarded " + Core.maybePlural(selectedItems.length, "message" + " to " + uri);
                angular.forEach(selectedItems, function (item, idx) {
                    var callback = (idx + 1 < selectedItems.length) ? intermediateResult : operationSuccess;
                    var body = item.body;
                    var headers = item.headers;
                    //console.log("sending to uri " + uri + " headers: " + JSON.stringify(headers) + " body: " + body);
                    jolokia.execute(mbean, "sendBodyAndHeaders(java.lang.String, java.lang.Object, java.util.Map)", uri, body, headers, Core.onSuccess(callback));
                });
            }
            $scope.forwardDialog.close();
        };
        $scope.endpointUris = function () {
            var endpointFolder = Camel.getSelectionCamelContextEndpoints(workspace);
            return (endpointFolder) ? endpointFolder.children.map(function (n) { return n.title; }) : [];
        };
        $scope.refresh = loadData;
        function intermediateResult() {
        }
        function operationSuccess() {
            if ($scope.messageDialog) {
                $scope.messageDialog.close();
            }
            $scope.gridOptions.selectedItems.splice(0);
            Core.notification("success", $scope.message);
            setTimeout(loadData, 50);
        }
        function loadData() {
            var mbean = null;
            if ($scope.contextId && $scope.endpointPath) {
                var node = workspace.findMBeanWithProperties(Camel.jmxDomain, {
                    context: $scope.contextId,
                    type: "endpoints",
                    name: $scope.endpointPath
                });
                if (node) {
                    mbean = node.objectName;
                }
            }
            if (!mbean) {
                mbean = workspace.getSelectedMBeanName();
            }
            if (mbean) {
                Camel.log.info("MBean: " + mbean);
                var options = Core.onSuccess(populateTable);
                jolokia.execute(mbean, 'browseAllMessagesAsXml(java.lang.Boolean)', true, options);
            }
        }
        function populateTable(response) {
            var data = [];
            if (angular.isString(response)) {
                // lets parse the XML DOM here...
                var doc = $.parseXML(response);
                var allMessages = $(doc).find("message");
                allMessages.each(function (idx, message) {
                    var messageData = Camel.createMessageFromXml(message);
                    data.push(messageData);
                });
            }
            $scope.messages = data;
            Core.$apply($scope);
        }
    }]);
})(Camel || (Camel = {}));

var Camel;
(function (Camel) {
    // NOTE this file is code generated by the ide-codegen module in Fuse IDE
    Camel.camelHeaderSchema = {
        definitions: {
            headers: {
                properties: {
                    "CamelAuthentication": {
                        type: "java.lang.String"
                    },
                    "CamelAuthenticationFailurePolicyId": {
                        type: "java.lang.String"
                    },
                    "CamelAcceptContentType": {
                        type: "java.lang.String"
                    },
                    "CamelAggregatedSize": {
                        type: "java.lang.String"
                    },
                    "CamelAggregatedTimeout": {
                        type: "java.lang.String"
                    },
                    "CamelAggregatedCompletedBy": {
                        type: "java.lang.String"
                    },
                    "CamelAggregatedCorrelationKey": {
                        type: "java.lang.String"
                    },
                    "CamelAggregationStrategy": {
                        type: "java.lang.String"
                    },
                    "CamelAggregationCompleteAllGroups": {
                        type: "java.lang.String"
                    },
                    "CamelAggregationCompleteAllGroupsInclusive": {
                        type: "java.lang.String"
                    },
                    "CamelAsyncWait": {
                        type: "java.lang.String"
                    },
                    "CamelBatchIndex": {
                        type: "java.lang.String"
                    },
                    "CamelBatchSize": {
                        type: "java.lang.String"
                    },
                    "CamelBatchComplete": {
                        type: "java.lang.String"
                    },
                    "CamelBeanMethodName": {
                        type: "java.lang.String"
                    },
                    "CamelBeanMultiParameterArray": {
                        type: "java.lang.String"
                    },
                    "CamelBinding": {
                        type: "java.lang.String"
                    },
                    "breadcrumbId": {
                        type: "java.lang.String"
                    },
                    "CamelCharsetName": {
                        type: "java.lang.String"
                    },
                    "CamelCreatedTimestamp": {
                        type: "java.lang.String"
                    },
                    "Content-Encoding": {
                        type: "java.lang.String"
                    },
                    "Content-Length": {
                        type: "java.lang.String"
                    },
                    "Content-Type": {
                        type: "java.lang.String"
                    },
                    "CamelCorrelationId": {
                        type: "java.lang.String"
                    },
                    "CamelDataSetIndex": {
                        type: "java.lang.String"
                    },
                    "org.apache.camel.default.charset": {
                        type: "java.lang.String"
                    },
                    "CamelDestinationOverrideUrl": {
                        type: "java.lang.String"
                    },
                    "CamelDisableHttpStreamCache": {
                        type: "java.lang.String"
                    },
                    "CamelDuplicateMessage": {
                        type: "java.lang.String"
                    },
                    "CamelExceptionCaught": {
                        type: "java.lang.String"
                    },
                    "CamelExceptionHandled": {
                        type: "java.lang.String"
                    },
                    "CamelEvaluateExpressionResult": {
                        type: "java.lang.String"
                    },
                    "CamelErrorHandlerHandled": {
                        type: "java.lang.String"
                    },
                    "CamelExternalRedelivered": {
                        type: "java.lang.String"
                    },
                    "CamelFailureHandled": {
                        type: "java.lang.String"
                    },
                    "CamelFailureEndpoint": {
                        type: "java.lang.String"
                    },
                    "CamelFailureRouteId": {
                        type: "java.lang.String"
                    },
                    "CamelFilterNonXmlChars": {
                        type: "java.lang.String"
                    },
                    "CamelFileLocalWorkPath": {
                        type: "java.lang.String"
                    },
                    "CamelFileName": {
                        type: "java.lang.String"
                    },
                    "CamelFileNameOnly": {
                        type: "java.lang.String"
                    },
                    "CamelFileNameProduced": {
                        type: "java.lang.String"
                    },
                    "CamelFileNameConsumed": {
                        type: "java.lang.String"
                    },
                    "CamelFilePath": {
                        type: "java.lang.String"
                    },
                    "CamelFileParent": {
                        type: "java.lang.String"
                    },
                    "CamelFileLastModified": {
                        type: "java.lang.String"
                    },
                    "CamelFileLength": {
                        type: "java.lang.String"
                    },
                    "CamelFilterMatched": {
                        type: "java.lang.String"
                    },
                    "CamelFileLockFileAcquired": {
                        type: "java.lang.String"
                    },
                    "CamelFileLockFileName": {
                        type: "java.lang.String"
                    },
                    "CamelGroupedExchange": {
                        type: "java.lang.String"
                    },
                    "CamelHttpBaseUri": {
                        type: "java.lang.String"
                    },
                    "CamelHttpCharacterEncoding": {
                        type: "java.lang.String"
                    },
                    "CamelHttpMethod": {
                        type: "java.lang.String"
                    },
                    "CamelHttpPath": {
                        type: "java.lang.String"
                    },
                    "CamelHttpProtocolVersion": {
                        type: "java.lang.String"
                    },
                    "CamelHttpQuery": {
                        type: "java.lang.String"
                    },
                    "CamelHttpResponseCode": {
                        type: "java.lang.String"
                    },
                    "CamelHttpUri": {
                        type: "java.lang.String"
                    },
                    "CamelHttpUrl": {
                        type: "java.lang.String"
                    },
                    "CamelHttpChunked": {
                        type: "java.lang.String"
                    },
                    "CamelHttpServletRequest": {
                        type: "java.lang.String"
                    },
                    "CamelHttpServletResponse": {
                        type: "java.lang.String"
                    },
                    "CamelInterceptedEndpoint": {
                        type: "java.lang.String"
                    },
                    "CamelInterceptSendToEndpointWhenMatched": {
                        type: "java.lang.String"
                    },
                    "CamelLanguageScript": {
                        type: "java.lang.String"
                    },
                    "CamelLogDebugBodyMaxChars": {
                        type: "java.lang.String"
                    },
                    "CamelLogDebugStreams": {
                        type: "java.lang.String"
                    },
                    "CamelLoopIndex": {
                        type: "java.lang.String"
                    },
                    "CamelLoopSize": {
                        type: "java.lang.String"
                    },
                    "CamelMaximumCachePoolSize": {
                        type: "java.lang.String"
                    },
                    "CamelMaximumEndpointCacheSize": {
                        type: "java.lang.String"
                    },
                    "CamelMessageHistory": {
                        type: "java.lang.String"
                    },
                    "CamelMulticastIndex": {
                        type: "java.lang.String"
                    },
                    "CamelMulticastComplete": {
                        type: "java.lang.String"
                    },
                    "CamelNotifyEvent": {
                        type: "java.lang.String"
                    },
                    "CamelOnCompletion": {
                        type: "java.lang.String"
                    },
                    "CamelOverruleFileName": {
                        type: "java.lang.String"
                    },
                    "CamelParentUnitOfWork": {
                        type: "java.lang.String"
                    },
                    "CamelRecipientListEndpoint": {
                        type: "java.lang.String"
                    },
                    "CamelReceivedTimestamp": {
                        type: "java.lang.String"
                    },
                    "CamelRedelivered": {
                        type: "java.lang.String"
                    },
                    "CamelRedeliveryCounter": {
                        type: "java.lang.String"
                    },
                    "CamelRedeliveryMaxCounter": {
                        type: "java.lang.String"
                    },
                    "CamelRedeliveryExhausted": {
                        type: "java.lang.String"
                    },
                    "CamelRedeliveryDelay": {
                        type: "java.lang.String"
                    },
                    "CamelRollbackOnly": {
                        type: "java.lang.String"
                    },
                    "CamelRollbackOnlyLast": {
                        type: "java.lang.String"
                    },
                    "CamelRouteStop": {
                        type: "java.lang.String"
                    },
                    "CamelSoapAction": {
                        type: "java.lang.String"
                    },
                    "CamelSkipGzipEncoding": {
                        type: "java.lang.String"
                    },
                    "CamelSlipEndpoint": {
                        type: "java.lang.String"
                    },
                    "CamelSplitIndex": {
                        type: "java.lang.String"
                    },
                    "CamelSplitComplete": {
                        type: "java.lang.String"
                    },
                    "CamelSplitSize": {
                        type: "java.lang.String"
                    },
                    "CamelTimerCounter": {
                        type: "java.lang.String"
                    },
                    "CamelTimerFiredTime": {
                        type: "java.lang.String"
                    },
                    "CamelTimerName": {
                        type: "java.lang.String"
                    },
                    "CamelTimerPeriod": {
                        type: "java.lang.String"
                    },
                    "CamelTimerTime": {
                        type: "java.lang.String"
                    },
                    "CamelToEndpoint": {
                        type: "java.lang.String"
                    },
                    "CamelTraceEvent": {
                        type: "java.lang.String"
                    },
                    "CamelTraceEventNodeId": {
                        type: "java.lang.String"
                    },
                    "CamelTraceEventTimestamp": {
                        type: "java.lang.String"
                    },
                    "CamelTraceEventExchange": {
                        type: "java.lang.String"
                    },
                    "Transfer-Encoding": {
                        type: "java.lang.String"
                    },
                    "CamelUnitOfWorkExhausted": {
                        type: "java.lang.String"
                    },
                    "CamelUnitOfWorkProcessSync": {
                        type: "java.lang.String"
                    },
                    "CamelXsltFileName": {
                        type: "java.lang.String"
                    }
                }
            }
        }
    };
})(Camel || (Camel = {}));

/// <reference path="../../includes.ts"/>
/// <reference path="camelPlugin.ts"/>
var Camel;
(function (Camel) {
    Camel._module.controller("Camel.DebugRouteController", ["$scope", "$element", "workspace", "jolokia", "localStorage", function ($scope, $element, workspace, jolokia, localStorage) {
        // ignore the cached stuff in camel.ts as it seems to bork the node ids for some reason...
        $scope.ignoreRouteXmlNode = true;
        $scope.startDebugging = function () {
            setDebugging(true);
        };
        $scope.stopDebugging = function () {
            setDebugging(false);
        };
        $scope.$on("$routeChangeSuccess", function (event, current, previous) {
            // lets do this asynchronously to avoid Error: $digest already in progress
            setTimeout(reloadData, 50);
        });
        $scope.$on("camel.diagram.selectedNodeId", function (event, value) {
            $scope.selectedDiagramNodeId = value;
            updateBreakpointFlag();
        });
        $scope.$on("camel.diagram.layoutComplete", function (event, value) {
            updateBreakpointIcons();
            $($element).find("g.node").dblclick(function (n) {
                var id = this.getAttribute("data-cid");
                $scope.toggleBreakpoint(id);
            });
        });
        $scope.$watch('workspace.selection', function () {
            if (workspace.moveIfViewInvalid())
                return;
            reloadData();
        });
        $scope.toggleBreakpoint = function (id) {
            var mbean = Camel.getSelectionCamelDebugMBean(workspace);
            if (mbean && id) {
                var method = isBreakpointSet(id) ? "removeBreakpoint" : "addBreakpoint";
                jolokia.execute(mbean, method, id, Core.onSuccess(breakpointsChanged));
            }
        };
        $scope.addBreakpoint = function () {
            var mbean = Camel.getSelectionCamelDebugMBean(workspace);
            if (mbean && $scope.selectedDiagramNodeId) {
                jolokia.execute(mbean, "addBreakpoint", $scope.selectedDiagramNodeId, Core.onSuccess(breakpointsChanged));
            }
        };
        $scope.removeBreakpoint = function () {
            var mbean = Camel.getSelectionCamelDebugMBean(workspace);
            if (mbean && $scope.selectedDiagramNodeId) {
                jolokia.execute(mbean, "removeBreakpoint", $scope.selectedDiagramNodeId, Core.onSuccess(breakpointsChanged));
            }
        };
        $scope.resume = function () {
            var mbean = Camel.getSelectionCamelDebugMBean(workspace);
            if (mbean) {
                jolokia.execute(mbean, "resumeAll", Core.onSuccess(clearStoppedAndResume));
            }
        };
        $scope.suspend = function () {
            var mbean = Camel.getSelectionCamelDebugMBean(workspace);
            if (mbean) {
                jolokia.execute(mbean, "suspendAll", Core.onSuccess(clearStoppedAndResume));
            }
        };
        $scope.step = function () {
            var mbean = Camel.getSelectionCamelDebugMBean(workspace);
            var stepNode = getStoppedBreakpointId();
            if (mbean && stepNode) {
                jolokia.execute(mbean, "stepBreakpoint(java.lang.String)", stepNode, Core.onSuccess(clearStoppedAndResume));
            }
        };
        // TODO refactor into common code with trace.ts?
        // START
        $scope.messages = [];
        $scope.mode = 'text';
        $scope.messageDialog = new UI.Dialog();
        $scope.gridOptions = Camel.createBrowseGridOptions();
        $scope.gridOptions.selectWithCheckboxOnly = false;
        $scope.gridOptions.showSelectionCheckbox = false;
        $scope.gridOptions.multiSelect = false;
        $scope.gridOptions.afterSelectionChange = onSelectionChanged;
        $scope.gridOptions.columnDefs.push({
            field: 'toNode',
            displayName: 'To Node'
        });
        $scope.openMessageDialog = function (message) {
            var idx = Core.pathGet(message, ["rowIndex"]);
            $scope.selectRowIndex(idx);
            if ($scope.row) {
                var body = $scope.row.body;
                $scope.mode = angular.isString(body) ? CodeEditor.detectTextFormat(body) : "text";
                $scope.messageDialog.open();
            }
        };
        $scope.selectRowIndex = function (idx) {
            $scope.rowIndex = idx;
            var selected = $scope.gridOptions.selectedItems;
            selected.splice(0, selected.length);
            if (idx >= 0 && idx < $scope.messages.length) {
                $scope.row = $scope.messages[idx];
                if ($scope.row) {
                    selected.push($scope.row);
                }
            }
            else {
                $scope.row = null;
            }
            onSelectionChanged();
        };
        // END
        function onSelectionChanged() {
            var toNode = getStoppedBreakpointId();
            if (toNode) {
                // lets highlight the node in the diagram
                var nodes = getDiagramNodes();
                Camel.highlightSelectedNode(nodes, toNode);
            }
        }
        function reloadData() {
            $scope.debugging = false;
            var mbean = Camel.getSelectionCamelDebugMBean(workspace);
            if (mbean) {
                $scope.debugging = jolokia.getAttribute(mbean, "Enabled", Core.onSuccess(null));
                if ($scope.debugging) {
                    jolokia.execute(mbean, "getBreakpoints", Core.onSuccess(onBreakpoints));
                    // get the breakpoints...
                    $scope.graphView = "app/camel/html/routes.html";
                    $scope.tableView = "app/camel/html/browseMessages.html";
                    Core.register(jolokia, $scope, {
                        type: 'exec',
                        mbean: mbean,
                        operation: 'getDebugCounter'
                    }, Core.onSuccess(onBreakpointCounter));
                }
                else {
                    $scope.graphView = null;
                    $scope.tableView = null;
                }
            }
        }
        function onBreakpointCounter(response) {
            var counter = response.value;
            if (counter && counter !== $scope.breakpointCounter) {
                $scope.breakpointCounter = counter;
                loadCurrentStack();
            }
        }
        /*
         * lets load current 'stack' of which breakpoints are active
         * and what is the current message content
         */
        function loadCurrentStack() {
            var mbean = Camel.getSelectionCamelDebugMBean(workspace);
            if (mbean) {
                console.log("getting suspended breakpoints!");
                jolokia.execute(mbean, "getSuspendedBreakpointNodeIds", Core.onSuccess(onSuspendedBreakpointNodeIds));
            }
        }
        function onSuspendedBreakpointNodeIds(response) {
            var mbean = Camel.getSelectionCamelDebugMBean(workspace);
            $scope.suspendedBreakpoints = response;
            $scope.stopped = response && response.length;
            var stopNodeId = getStoppedBreakpointId();
            if (mbean && stopNodeId) {
                jolokia.execute(mbean, 'dumpTracedMessagesAsXml', stopNodeId, Core.onSuccess(onMessages));
                // lets update the diagram selection to the newly stopped node
                $scope.selectedDiagramNodeId = stopNodeId;
            }
            updateBreakpointIcons();
            Core.$apply($scope);
        }
        function onMessages(response) {
            console.log("onMessage! ");
            $scope.messages = [];
            if (response) {
                var xml = response;
                if (angular.isString(xml)) {
                    // lets parse the XML DOM here...
                    var doc = $.parseXML(xml);
                    var allMessages = $(doc).find("fabricTracerEventMessage");
                    if (!allMessages || !allMessages.length) {
                        // lets try find another element name
                        allMessages = $(doc).find("backlogTracerEventMessage");
                    }
                    allMessages.each(function (idx, message) {
                        var messageData = Camel.createMessageFromXml(message);
                        var toNode = $(message).find("toNode").text();
                        if (toNode) {
                            messageData["toNode"] = toNode;
                        }
                        $scope.messages.push(messageData);
                    });
                }
            }
            else {
                console.log("WARNING: dumpTracedMessagesAsXml() returned no results!");
            }
            // lets update the selection and selected row for the message detail view
            updateMessageSelection();
            console.log("has messages " + $scope.messages.length + " selected row " + $scope.row + " index " + $scope.rowIndex);
            Core.$apply($scope);
            updateBreakpointIcons();
        }
        function updateMessageSelection() {
            $scope.selectRowIndex($scope.rowIndex);
            if (!$scope.row && $scope.messageDialog.show) {
                // lets make a dummy empty row
                // so we can keep the detail view while resuming
                $scope.row = {
                    headers: {},
                    body: ""
                };
            }
        }
        function clearStoppedAndResume() {
            $scope.messages = [];
            $scope.suspendedBreakpoints = [];
            $scope.stopped = false;
            updateMessageSelection();
            Core.$apply($scope);
            updateBreakpointIcons();
        }
        /*
         * Return the current node id we are stopped at
         */
        function getStoppedBreakpointId() {
            var stepNode = null;
            var stepNodes = $scope.suspendedBreakpoints;
            if (stepNodes && stepNodes.length) {
                stepNode = stepNodes[0];
                if (stepNodes.length > 1 && isSuspendedAt($scope.selectedDiagramNodeId)) {
                    // TODO should consider we stepping from different nodes based on the call thread or selection?
                    stepNode = $scope.selectedDiagramNodeId;
                }
            }
            return stepNode;
        }
        /*
         * Returns true if the execution is currently suspended at the given node
         */
        function isSuspendedAt(nodeId) {
            return containsNodeId($scope.suspendedBreakpoints, nodeId);
        }
        function onBreakpoints(response) {
            $scope.breakpoints = response;
            updateBreakpointFlag();
            // update the breakpoint icons...
            var nodes = getDiagramNodes();
            if (nodes.length) {
                updateBreakpointIcons(nodes);
            }
            Core.$apply($scope);
        }
        /*
         * Returns true if there is a breakpoint set at the given node id
         */
        function isBreakpointSet(nodeId) {
            return containsNodeId($scope.breakpoints, nodeId);
        }
        function updateBreakpointFlag() {
            $scope.hasBreakpoint = isBreakpointSet($scope.selectedDiagramNodeId);
        }
        function containsNodeId(breakpoints, nodeId) {
            return nodeId && breakpoints && breakpoints.some(nodeId);
        }
        function getDiagramNodes() {
            var svg = d3.select("svg");
            return svg.selectAll("g .node");
        }
        var breakpointImage = Core.url("/app/camel/doc/img/debug/breakpoint.gif");
        var suspendedBreakpointImage = Core.url("/app/camel/doc/img/debug/breakpoint-suspended.gif");
        function updateBreakpointIcons(nodes) {
            if (nodes === void 0) { nodes = getDiagramNodes(); }
            nodes.each(function (object) {
                // add breakpoint icon
                var nodeId = object.cid;
                var thisNode = d3.select(this);
                var icons = thisNode.selectAll("image.breakpoint");
                var isSuspended = isSuspendedAt(nodeId);
                var isBreakpoint = isBreakpointSet(nodeId);
                if (isBreakpoint || isSuspended) {
                    var imageUrl = isSuspended ? suspendedBreakpointImage : breakpointImage;
                    // lets add an icon image if we don't already have one
                    if (!icons.length || !icons[0].length) {
                        thisNode.append("image").attr("xlink:href", function (d) {
                            return imageUrl;
                        }).attr("class", "breakpoint").attr("x", -12).attr("y", -20).attr("height", 24).attr("width", 24);
                    }
                    else {
                        icons.attr("xlink:href", function (d) {
                            return imageUrl;
                        });
                    }
                }
                else {
                    icons.remove();
                }
            });
        }
        function breakpointsChanged(response) {
            reloadData();
            Core.$apply($scope);
        }
        function setDebugging(flag) {
            var mbean = Camel.getSelectionCamelDebugMBean(workspace);
            if (mbean) {
                var method = flag ? "enableDebugger" : "disableDebugger";
                var max = Camel.maximumTraceOrDebugBodyLength(localStorage);
                var streams = Camel.traceOrDebugIncludeStreams(localStorage);
                jolokia.setAttribute(mbean, "BodyMaxChars", max);
                jolokia.setAttribute(mbean, "BodyIncludeStreams", streams);
                jolokia.setAttribute(mbean, "BodyIncludeFiles", streams);
                jolokia.execute(mbean, method, Core.onSuccess(breakpointsChanged));
            }
        }
    }]);
})(Camel || (Camel = {}));

/// <reference path="../../includes.ts"/>
/// <reference path="camelPlugin.ts"/>
var Camel;
(function (Camel) {
    Camel._module.controller("Camel.EndpointController", ["$scope", "$location", "localStorage", "workspace", "jolokia", function ($scope, $location, localStorage, workspace, jolokia) {
        Camel.initEndpointChooserScope($scope, $location, localStorage, workspace, jolokia);
        $scope.workspace = workspace;
        $scope.message = "";
        $scope.createEndpoint = function (name) {
            var jolokia = workspace.jolokia;
            if (jolokia) {
                var mbean = Camel.getSelectionCamelContextMBean(workspace);
                if (mbean) {
                    $scope.message = "Creating endpoint " + name;
                    var operation = "createEndpoint(java.lang.String)";
                    jolokia.execute(mbean, operation, name, Core.onSuccess(operationSuccess));
                }
                else {
                    Core.notification("error", "Could not find the CamelContext MBean!");
                }
            }
        };
        $scope.createEndpointFromData = function () {
            if ($scope.selectedComponentName && $scope.endpointPath) {
                var name = $scope.selectedComponentName + "://" + $scope.endpointPath;
                console.log("Have endpoint data " + JSON.stringify($scope.endpointParameters));
                var params = "";
                angular.forEach($scope.endpointParameters, function (value, key) {
                    var prefix = params ? "&" : "";
                    params += prefix + key + "=" + value;
                });
                if (params) {
                    name += "?" + params;
                }
                // TODO use form data too for URIs parameters...
                $scope.createEndpoint(name);
            }
        };
        $scope.deleteEndpoint = function () {
            var jolokia = workspace.jolokia;
            var selection = workspace.selection;
            var entries = selection.entries;
            if (selection && jolokia && entries) {
                var domain = selection.domain;
                var brokerName = entries["BrokerName"];
                var name = entries["Destination"];
                var isQueue = "Topic" !== entries["Type"];
                if (domain && brokerName) {
                    var mbean = "" + domain + ":BrokerName=" + brokerName + ",Type=Broker";
                    $scope.message = "Deleting " + (isQueue ? "queue" : "topic") + " " + name;
                    var operation = "removeEndpoint(java.lang.String)";
                    jolokia.execute(mbean, operation, name, Core.onSuccess(deleteSuccess));
                }
            }
        };
        function operationSuccess() {
            $scope.endpointName = "";
            $scope.workspace.operationCounter += 1;
            Core.$apply($scope);
            Core.notification("success", $scope.message);
        }
        function deleteSuccess() {
            // lets set the selection to the parent
            if (workspace.selection) {
                var parent = Core.pathGet(workspace, ["selection", "parent"]);
                if (parent) {
                    $scope.workspace.updateSelectionNode(parent);
                }
            }
            $scope.workspace.operationCounter += 1;
            Core.$apply($scope);
            Core.notification("success", $scope.message);
        }
    }]);
})(Camel || (Camel = {}));

/// <reference path="../../includes.ts"/>
/**
 * @module Camel
 */
var Camel;
(function (Camel) {
    /**
     * Define the default categories for endpoints and map them to endpoint names
     * @property
     * @for Camel
     * @type {ObjecT}
     */
    Camel.endpointCategories = {
        bigdata: {
            label: "Big Data",
            endpoints: ["hdfs", "hbase", "lucene", "solr"],
            endpointIcon: "/img/icons/camel/endpointRepository24.png"
        },
        database: {
            label: "Database",
            endpoints: ["couchdb", "elasticsearch", "hbase", "jdbc", "jpa", "hibernate", "mongodb", "mybatis", "sql"],
            endpointIcon: "/img/icons/camel/endpointRepository24.png"
        },
        cloud: {
            label: "Cloud",
            endpoints: [
                "aws-cw",
                "aws-ddb",
                "aws-sdb",
                "aws-ses",
                "aws-sns",
                "aws-sqs",
                "aws-s3",
                "gauth",
                "ghhtp",
                "glogin",
                "gtask",
                "jclouds"
            ]
        },
        core: {
            label: "Core",
            endpoints: ["bean", "direct", "seda"]
        },
        messaging: {
            label: "Messaging",
            endpoints: ["jms", "activemq", "amqp", "cometd", "cometds", "mqtt", "netty", "vertx", "websocket"],
            endpointIcon: "/img/icons/camel/endpointQueue24.png"
        },
        mobile: {
            label: "Mobile",
            endpoints: ["apns"]
        },
        sass: {
            label: "SaaS",
            endpoints: ["salesforce", "sap-netweaver"]
        },
        social: {
            label: "Social",
            endpoints: ["atom", "facebook", "irc", "ircs", "rss", "smpp", "twitter", "weather"]
        },
        storage: {
            label: "Storage",
            endpointIcon: "/img/icons/camel/endpointFolder24.png",
            endpoints: ["file", "ftp", "sftp", "scp", "jsch"]
        },
        template: {
            label: "Templating",
            endpoints: ["freemarker", "velocity", "xquery", "xslt", "scalate", "string-template"]
        }
    };
    /**
     * Maps endpoint names to a category object
     * @property
     * @for Camel
     * @type {ObjecT}
     */
    Camel.endpointToCategory = {};
    Camel.endpointIcon = "/img/icons/camel/endpoint24.png";
    /**
     *  specify custom label & icon properties for endpoint names
     * @property
     * @for Camel
     * @type {ObjecT}
     */
    Camel.endpointConfigurations = {
        drools: {
            icon: "/img/icons/camel/endpointQueue24.png"
        },
        quartz: {
            icon: "/img/icons/camel/endpointTimer24.png"
        },
        facebook: {
            icon: "/img/icons/camel/endpoints/facebook24.jpg"
        },
        salesforce: {
            icon: "/img/icons/camel/endpoints/salesForce24.png"
        },
        sap: {
            icon: "/img/icons/camel/endpoints/SAPe24.png"
        },
        "sap-netweaver": {
            icon: "/img/icons/camel/endpoints/SAPNetweaver24.jpg"
        },
        timer: {
            icon: "/img/icons/camel/endpointTimer24.png"
        },
        twitter: {
            icon: "/img/icons/camel/endpoints/twitter24.png"
        },
        weather: {
            icon: "/img/icons/camel/endpoints/weather24.jpg"
        }
    };
    /**
     * Define the default form configurations
     * @property
     * @for Camel
     * @type {ObjecT}
     */
    Camel.endpointForms = {
        file: {
            tabs: {
                //'Core': ['key', 'value'],
                'Options': ['*']
            }
        },
        activemq: {
            tabs: {
                'Connection': ['clientId', 'transacted', 'transactedInOut', 'transactionName', 'transactionTimeout'],
                'Producer': ['timeToLive', 'priority', 'allowNullBody', 'pubSubNoLocal', 'preserveMessageQos'],
                'Consumer': ['concurrentConsumers', 'acknowledgementModeName', 'selector', 'receiveTimeout'],
                'Reply': ['replyToDestination', 'replyToDeliveryPersistent', 'replyToCacheLevelName', 'replyToDestinationSelectorName'],
                'Options': ['*']
            }
        }
    };
    Camel.endpointForms["jms"] = Camel.endpointForms.activemq;
    angular.forEach(Camel.endpointCategories, function (category, catKey) {
        category.id = catKey;
        angular.forEach(category.endpoints, function (endpoint) {
            Camel.endpointToCategory[endpoint] = category;
        });
    });
    /**
     * Override the EIP pattern tabs...
     * @property
     * @for Camel
     * @type {ObjecT}
     */
    var camelModelTabExtensions = {
        route: {
            'Overview': ['id', 'description'],
            'Advanced': ['*']
        }
    };
    function getEndpointIcon(endpointName) {
        var value = Camel.getEndpointConfig(endpointName, null);
        var answer = Core.pathGet(value, ["icon"]);
        if (!answer) {
            var category = getEndpointCategory(endpointName);
            answer = Core.pathGet(category, ["endpointIcon"]);
        }
        return answer || Camel.endpointIcon;
    }
    Camel.getEndpointIcon = getEndpointIcon;
    function getEndpointConfig(endpointName, category) {
        var answer = Camel.endpointConfigurations[endpointName];
        if (!answer) {
            answer = {};
            Camel.endpointConfigurations[endpointName] = answer;
        }
        if (!answer.label) {
            answer.label = endpointName;
        }
        if (!answer.icon) {
            answer.icon = Core.pathGet(category, ["endpointIcon"]) || Camel.endpointIcon;
        }
        if (!answer.category) {
            answer.category = category;
        }
        return answer;
    }
    Camel.getEndpointConfig = getEndpointConfig;
    function getEndpointCategory(endpointName) {
        return Camel.endpointToCategory[endpointName] || Camel.endpointCategories.core;
    }
    Camel.getEndpointCategory = getEndpointCategory;
    function getConfiguredCamelModel() {
        var schema = _apacheCamelModel;
        var definitions = schema["definitions"];
        if (definitions) {
            angular.forEach(camelModelTabExtensions, function (tabs, name) {
                var model = definitions[name];
                if (model) {
                    if (!model["tabs"]) {
                        model["tabs"] = tabs;
                    }
                }
            });
        }
        return schema;
    }
    Camel.getConfiguredCamelModel = getConfiguredCamelModel;
    function initEndpointChooserScope($scope, $location, localStorage, workspace, jolokia) {
        $scope.selectedComponentName = null;
        $scope.endpointParameters = {};
        $scope.endpointPath = "";
        $scope.schema = {
            definitions: {}
        };
        $scope.jolokia = jolokia;
        // lets see if we need to use a remote jolokia container
        var versionId = $scope.branch;
        var profileId = Fabric.pagePathToProfileId($scope.pageId);
        if (profileId && versionId) {
            Fabric.profileJolokia(jolokia, profileId, versionId, function (profileJolokia) {
                if (!profileJolokia) {
                    // TODO we should expose this to the user somewhere nicely!
                    Camel.log.info("No container is running for profile " + profileId + " and version " + versionId + " so using current container for endpoint completion");
                    profileJolokia = jolokia;
                }
                $scope.jolokia = profileJolokia;
                // force a reload
                $scope.profileWorkspace = null;
                $scope.loadEndpointNames();
            });
        }
        var silentOptions = { silent: true };
        $scope.$watch('workspace.selection', function () {
            $scope.loadEndpointNames();
        });
        $scope.$watch('selectedComponentName', function () {
            if ($scope.selectedComponentName !== $scope.loadedComponentName) {
                $scope.endpointParameters = {};
                $scope.loadEndpointSchema($scope.selectedComponentName);
                $scope.loadedComponentName = $scope.selectedComponentName;
            }
        });
        $scope.endpointCompletions = function (completionText) {
            var answer = null;
            var mbean = findCamelContextMBean();
            var componentName = $scope.selectedComponentName;
            var endpointParameters = {};
            if (mbean && componentName && completionText) {
                answer = $scope.jolokia.execute(mbean, 'completeEndpointPath', componentName, endpointParameters, completionText, Core.onSuccess(null, silentOptions));
            }
            return answer || [];
        };
        $scope.loadEndpointNames = function () {
            $scope.componentNames = null;
            var mbean = findCamelContextMBean();
            if (mbean) {
                //$scope.jolokia.execute(mbean, 'findComponentNames', Core.onSuccess(onComponents, silentOptions));
                $scope.jolokia.execute(mbean, 'findComponentNames', Core.onSuccess(onComponents, { silent: true }));
            }
            else {
                console.log("WARNING: No camel context mbean so cannot load component names");
            }
        };
        $scope.loadEndpointSchema = function (componentName) {
            var mbean = findCamelContextMBean();
            if (mbean && componentName && componentName !== $scope.loadedEndpointSchema) {
                $scope.selectedComponentName = componentName;
                $scope.jolokia.execute(mbean, 'componentParameterJsonSchema', componentName, Core.onSuccess(onEndpointSchema, silentOptions));
            }
        };
        function onComponents(response) {
            $scope.componentNames = response;
            Camel.log.info("onComponents: " + response);
            $scope.hasComponentNames = $scope.componentNames ? true : false;
            Core.$apply($scope);
        }
        function onEndpointSchema(response) {
            if (response) {
                try {
                    //console.log("got JSON: " + response);
                    var json = JSON.parse(response);
                    var endpointName = $scope.selectedComponentName;
                    configureEndpointSchema(endpointName, json);
                    $scope.endpointSchema = json;
                    $scope.schema.definitions[endpointName] = json;
                    $scope.loadedEndpointSchema = endpointName;
                    Core.$apply($scope);
                }
                catch (e) {
                    console.log("Failed to parse JSON " + e);
                    console.log("JSON: " + response);
                }
            }
        }
        function configureEndpointSchema(endpointName, json) {
            console.log("======== configuring schema for " + endpointName);
            var config = Camel.endpointForms[endpointName];
            if (config && json) {
                if (config.tabs) {
                    json.tabs = config.tabs;
                }
            }
        }
        function findCamelContextMBean() {
            var profileWorkspace = $scope.profileWorkspace;
            if (!profileWorkspace) {
                var removeJolokia = $scope.jolokia;
                if (removeJolokia) {
                    profileWorkspace = Core.createRemoteWorkspace(removeJolokia, $location, localStorage);
                    $scope.profileWorkspace = profileWorkspace;
                }
            }
            if (!profileWorkspace) {
                Camel.log.info("No profileWorkspace found so defaulting it to workspace for now");
                profileWorkspace = workspace;
            }
            // TODO we need to find the MBean for the CamelContext / Route we are editing!
            var componentName = $scope.selectedComponentName;
            var selectedCamelContextId;
            var selectedRouteId;
            if (angular.isDefined($scope.camelSelectionDetails)) {
                selectedCamelContextId = $scope.camelSelectionDetails.selectedCamelContextId;
                selectedRouteId = $scope.camelSelectionDetails.selectedRouteId;
            }
            console.log("==== componentName " + componentName + " selectedCamelContextId: " + selectedCamelContextId + " selectedRouteId: " + selectedRouteId);
            var contextsById = Camel.camelContextMBeansById(profileWorkspace);
            if (selectedCamelContextId) {
                var mbean = Core.pathGet(contextsById, [selectedCamelContextId, "mbean"]);
                if (mbean) {
                    return mbean;
                }
            }
            if (selectedRouteId) {
                var map = Camel.camelContextMBeansByRouteId(profileWorkspace);
                var mbean = Core.pathGet(map, [selectedRouteId, "mbean"]);
                if (mbean) {
                    return mbean;
                }
            }
            if (componentName) {
                var map = Camel.camelContextMBeansByComponentName(profileWorkspace);
                var mbean = Core.pathGet(map, [componentName, "mbean"]);
                if (mbean) {
                    return mbean;
                }
            }
            // NOTE we don't really know which camel context to pick, so lets just find the first one?
            var answer = null;
            angular.forEach(contextsById, function (details, id) {
                var mbean = details.mbean;
                if (!answer && mbean)
                    answer = mbean;
            });
            return answer;
            /*
                  // we could be remote to lets query jolokia
                  var results = $scope.jolokia.search("org.apache.camel:*,type=context", Core.onSuccess(null));
                  //var results = $scope.jolokia.search("org.apache.camel:*", Core.onSuccess(null));
                  if (results && results.length) {
                    console.log("===== Got results: " + results);
                    return results[0];
                  }
            
                  var mbean = Camel.getSelectionCamelContextMBean(profileWorkspace);
                  if (!mbean && $scope.findProfileCamelContext) {
                    // TODO as a hack for now lets just find any camel context we can
                    var folder = Core.getMBeanTypeFolder(profileWorkspace, Camel.jmxDomain, "context");
                    mbean = Core.pathGet(folder, ["objectName"]);
                  }
                  return mbean;
            */
        }
    }
    Camel.initEndpointChooserScope = initEndpointChooserScope;
})(Camel || (Camel = {}));

/// <reference path="../../includes.ts"/>
/// <reference path="camelPlugin.ts"/>
var Camel;
(function (Camel) {
    Camel._module.controller("Camel.FabricDiagramController", ["$scope", "$compile", "$location", "localStorage", "jolokia", "workspace", function ($scope, $compile, $location, localStorage, jolokia, workspace) {
        Fabric.initScope($scope, $location, jolokia, workspace);
        var isFmc = Wiki.isFMCContainer(workspace);
        $scope.isFmc = isFmc;
        $scope.selectedNode = null;
        var defaultFlags = {
            panel: true,
            popup: false,
            label: true,
            container: false,
            endpoint: true,
            route: true,
            context: false,
            consumer: true,
            producer: true
        };
        $scope.viewSettings = {};
        $scope.shapeSize = {
            context: 12,
            route: 10,
            endpoint: 7
        };
        var graphBuilder = new ForceGraph.GraphBuilder();
        Core.bindModelToSearchParam($scope, $location, "searchFilter", "q", "");
        angular.forEach(defaultFlags, function (defaultValue, key) {
            var modelName = "viewSettings." + key;
            // bind model values to search params...
            function currentValue() {
                var answer = $location.search()[paramName] || defaultValue;
                return answer === "false" ? false : answer;
            }
            var paramName = key;
            var value = currentValue();
            Core.pathSet($scope, modelName, value);
            $scope.$watch(modelName, function () {
                var current = Core.pathGet($scope, modelName);
                var old = currentValue();
                if (current !== old) {
                    var defaultValue = defaultFlags[key];
                    if (current !== defaultValue) {
                        if (!current) {
                            current = "false";
                        }
                        $location.search(paramName, current);
                    }
                    else {
                        $location.search(paramName, null);
                    }
                }
                redrawGraph();
            });
        });
        $scope.connectToContext = function () {
            var selectedNode = $scope.selectedNode;
            if (selectedNode) {
                var container = selectedNode["container"] || selectedNode;
                var postfix = null;
                connectToContainer(container, postfix);
            }
        };
        $scope.connectToEndpoint = function () {
            var selectedNode = $scope.selectedNode;
            if (selectedNode) {
                var container = selectedNode["container"] || selectedNode;
                var postfix = null;
                connectToContainer(container, postfix);
            }
        };
        function connectToContainer(container, postfix, viewPrefix) {
            if (viewPrefix === void 0) { viewPrefix = "#/jmx/attributes?tab=camel"; }
            var view = viewPrefix;
            if (postfix) {
                view += postfix;
            }
            // TODO if local just link to local view!
            $scope.doConnect(container, view);
        }
        $scope.$on('$destroy', function (event) {
            stopOldJolokia();
        });
        function stopOldJolokia() {
            var oldJolokia = $scope.selectedNodeJolokia;
            if (oldJolokia && oldJolokia !== jolokia) {
                oldJolokia.stop();
            }
        }
        $scope.$watch("selectedNode", function (newValue, oldValue) {
            // lets cancel any previously registered thingy
            if ($scope.unregisterFn) {
                $scope.unregisterFn();
                $scope.unregisterFn = null;
            }
            var node = $scope.selectedNode;
            if (node) {
                var mbean = node.objectName;
                var container = node.container || {};
                var nodeJolokia = node.jolokia || container.jolokia || jolokia;
                if (nodeJolokia !== $scope.selectedNodeJolokia) {
                    stopOldJolokia();
                    $scope.selectedNodeJolokia = nodeJolokia;
                    if (nodeJolokia !== jolokia) {
                        var rate = Core.parseIntValue(localStorage['updateRate'] || "2000", "update rate");
                        if (rate) {
                            nodeJolokia.start(rate);
                        }
                    }
                }
                var dummyResponse = { value: node.panelProperties || {} };
                if (mbean && nodeJolokia) {
                    $scope.unregisterFn = Core.register(nodeJolokia, $scope, {
                        type: 'read',
                        mbean: mbean
                    }, Core.onSuccess(renderNodeAttributes, { error: function (response) {
                        // probably we've got a wrong mbean name?
                        // so lets render at least
                        renderNodeAttributes(dummyResponse);
                        Core.defaultJolokiaErrorHandler(response);
                    } }));
                }
                else {
                    renderNodeAttributes(dummyResponse);
                }
            }
        });
        var ignoreNodeAttributes = [
            "CamelId",
            "CamelManagementName"
        ];
        var ignoreNodeAttributesByType = {
            context: ["ApplicationContextClassName", "CamelId", "ClassResolver", "ManagementName", "PackageScanClassResolver", "Properties"],
            endpoint: ["Camel", "Endpoint"],
            route: ["Description"]
        };
        var onlyShowAttributesByType = {
            broker: []
        };
        function renderNodeAttributes(response) {
            var properties = [];
            if (response) {
                var value = response.value || {};
                $scope.selectedNodeAttributes = value;
                var selectedNode = $scope.selectedNode || {};
                var container = selectedNode['container'] || {};
                var nodeType = selectedNode["type"];
                var brokerName = selectedNode["brokerName"];
                var containerId = container["id"];
                var group = selectedNode["group"] || container["group"];
                var jolokiaUrl = selectedNode["jolokiaUrl"] || container["jolokiaUrl"];
                var profile = selectedNode["profile"] || container["profile"];
                var version = selectedNode["version"] || container["version"];
                var isBroker = nodeType && nodeType.startsWith("broker");
                var ignoreKeys = ignoreNodeAttributes.concat(ignoreNodeAttributesByType[nodeType] || []);
                var onlyShowKeys = onlyShowAttributesByType[nodeType];
                angular.forEach(value, function (v, k) {
                    if (onlyShowKeys ? onlyShowKeys.indexOf(k) >= 0 : ignoreKeys.indexOf(k) < 0) {
                        var formattedValue = Core.humanizeValueHtml(v);
                        properties.push({ key: Core.humanizeValue(k), value: formattedValue });
                    }
                });
                properties = properties.sortBy("key");
                if (containerId && isFmc) {
                    //var containerModel = "selectedNode.container";
                    properties.splice(0, 0, { key: "Container", value: $compile('<div fabric-container-link="' + selectedNode['container']['id'] + '"></div>')($scope) });
                }
                var typeLabel = selectedNode["typeLabel"];
                var name = selectedNode["name"] || selectedNode["id"] || selectedNode['objectName'];
                if (typeLabel) {
                    var html = name;
                    if (nodeType === "queue" || nodeType === "topic") {
                        html = createDestinationLink(name, nodeType);
                    }
                    var typeProperty = { key: typeLabel, value: html };
                    properties.splice(0, 0, typeProperty);
                }
            }
            $scope.selectedNodeProperties = properties;
            Core.$apply($scope);
        }
        /**
         * Generates the HTML for a link to the destination
         */
        function createDestinationLink(destinationName, destinationType) {
            if (destinationType === void 0) { destinationType = "queue"; }
            return $compile('<a target="destination" title="' + destinationName + '" ng-click="connectToEndpoint()">' + destinationName + '</a>')($scope);
        }
        $scope.$watch("searchFilter", function (newValue, oldValue) {
            redrawGraph();
        });
        if (isFmc) {
            $scope.versionId = Fabric.getDefaultVersionId(jolokia);
            var fields = ["id", "alive", "parentId", "profileIds", "versionId", "provisionResult", "jolokiaUrl", "jmxDomains"];
            Fabric.getContainersFields(jolokia, fields, onFabricContainerData);
        }
        else {
            // lets just use the current stuff from the workspace
            $scope.$watch('workspace.tree', function () {
                reloadLocalJmxTree();
            });
            $scope.$on('jmxTreeUpdated', function () {
                reloadLocalJmxTree();
            });
        }
        function reloadLocalJmxTree() {
            var localContainer = {
                jolokia: jolokia
            };
            $scope.activeContainers = {
                "local": localContainer
            };
            redrawGraph();
            $scope.containerCount = 1;
        }
        function onFabricContainerData(response) {
            if (response) {
                var responseJson = angular.toJson(response);
                if ($scope.responseJson === responseJson) {
                    return;
                }
                $scope.responseJson = responseJson;
                var containersToDelete = $scope.activeContainers || {};
                $scope.activeContainers = (response || {}).filter(function (c) { return c.jmxDomains.any(Camel.jmxDomain); });
                $scope.containerCount = $scope.activeContainers.length;
                // query containers which have camel...
                redrawGraph();
            }
            else {
                $scope.containerCount = 0;
            }
        }
        function redrawGraph() {
            graphBuilder = new ForceGraph.GraphBuilder();
            // TODO delete any nodes from dead containers in containersToDelete
            angular.forEach($scope.activeContainers, function (container, id) {
                var containerJolokia = container.jolokia;
                if (!containerJolokia) {
                    var jolokiaUrl = container["jolokiaUrl"];
                    if (jolokiaUrl) {
                        var url = Core.useProxyIfExternal(jolokiaUrl);
                        containerJolokia = Fabric.createJolokia(url);
                    }
                }
                if (containerJolokia) {
                    onContainerJolokia(containerJolokia, container);
                }
                else {
                    Fabric.containerJolokia(jolokia, id, function (containerJolokia) { return onContainerJolokia(containerJolokia, container); });
                }
            });
            //$scope.graph = graphBuilder.buildGraph();
            Core.$apply($scope);
        }
        /**
         * Returns true if the given CamelContext ID matches the current search filter
         */
        function matchesContextId(contextId) {
            if (contextId) {
                return !$scope.searchFilter || contextId.indexOf($scope.searchFilter) >= 0;
            }
            return false;
        }
        function onContainerJolokia(containerJolokia, container) {
            if (containerJolokia) {
                container.jolokia = containerJolokia;
                var containerId = container.id || "local";
                var idPrefix = containerId + ":";
                var endpointUriToObject = {};
                var startedLoadMetaDataFromEndpointMBeans = false;
                function getOrCreateRoute(objectName, properties, addEndpointLink, routeId, contextId, camelContext) {
                    if (routeId === void 0) { routeId = null; }
                    if (contextId === void 0) { contextId = null; }
                    if (camelContext === void 0) { camelContext = null; }
                    if (!objectName) {
                        // lets try guess the mbean name
                        objectName = Camel.jmxDomain + ':context=' + contextId + ',type=routes,name="' + routeId + '"';
                    }
                    var details = Core.parseMBean(objectName);
                    var attributes = details['attributes'];
                    var contextId = attributes["context"];
                    if (!routeId) {
                        routeId = Core.trimQuotes(attributes["name"]);
                    }
                    attributes["routeId"] = routeId;
                    attributes["mbean"] = objectName;
                    attributes["container"] = container;
                    attributes["type"] = "route";
                    var route = null;
                    if (routeId && matchesContextId(contextId)) {
                        route = getOrAddNode("route", idPrefix + routeId, attributes, function () {
                            return {
                                name: routeId,
                                typeLabel: "Route",
                                container: container,
                                objectName: objectName,
                                jolokia: containerJolokia,
                                popup: {
                                    title: "Route: " + routeId,
                                    content: "<p>context: " + contextId + "</p>"
                                }
                            };
                        });
                        if (addEndpointLink) {
                            var uri = properties["EndpointUri"];
                            if (uri && route) {
                                var endpoint = null;
                                var escaledUrl = Camel.escapeEndpointUriNameForJmx(uri);
                                var urlsToTry = [uri, escaledUrl];
                                angular.forEach(urlsToTry, function (key) {
                                    if (!endpoint) {
                                        endpoint = endpointUriToObject[key];
                                    }
                                });
                                if (!endpoint) {
                                    angular.forEach(urlsToTry, function (key) {
                                        if (!endpoint) {
                                            var idx = key.lastIndexOf("?");
                                            if (idx > 0) {
                                                var prefix = key.substring(0, idx);
                                                endpoint = endpointUriToObject[prefix];
                                            }
                                        }
                                    });
                                }
                                addLink(route, endpoint, "consumer");
                            }
                        }
                        if ($scope.viewSettings.route && $scope.viewSettings.context) {
                            if (!camelContext) {
                                camelContext = getOrCreateCamelContext(contextId);
                            }
                            addLink(camelContext, route, "route");
                        }
                    }
                    return route;
                }
                function getOrCreateEndpoint(objectName, uri, contextId) {
                    if (uri === void 0) { uri = null; }
                    if (contextId === void 0) { contextId = null; }
                    if (!objectName) {
                        // lets try guess the mbean name
                        objectName = Camel.jmxDomain + ':context=' + contextId + ',type=endpoints,name="' + Camel.escapeEndpointUriNameForJmx(uri) + '"';
                    }
                    var details = Core.parseMBean(objectName);
                    var attributes = details['attributes'];
                    //log.info("attributes: " + angular.toJson(attributes));
                    var contextId = attributes["context"];
                    if (!uri) {
                        uri = Core.trimQuotes(attributes["name"]);
                    }
                    attributes["uri"] = uri;
                    attributes["mbean"] = objectName;
                    attributes["container"] = container;
                    attributes["contextId"] = contextId;
                    var endpoint = null;
                    if (uri && matchesContextId(contextId)) {
                        endpoint = getOrAddNode("endpoint", idPrefix + uri, attributes, function () {
                            return {
                                name: uri,
                                typeLabel: "Endpoint",
                                container: container,
                                objectName: objectName,
                                jolokia: containerJolokia,
                                popup: {
                                    title: "Endpoint: " + uri,
                                    content: "<p>context: " + contextId + "</p>"
                                }
                            };
                        });
                        if (endpoint) {
                            endpointUriToObject[uri] = endpoint;
                        }
                    }
                    return endpoint;
                }
                // lets use the old way for pre-camel 2.13 versions
                function loadMetaDataFromEndpointMBeans() {
                    // find routes
                    if ($scope.viewSettings.route) {
                        containerJolokia.request({ type: "read", mbean: "org.apache.camel:type=routes,*", attribute: ["EndpointUri"] }, Core.onSuccess(function (response) {
                            angular.forEach(response.value, function (properties, objectName) {
                                getOrCreateRoute(objectName, properties, true);
                            });
                            graphModelUpdated();
                        }));
                    }
                    if ($scope.viewSettings.endpoint) {
                        containerJolokia.search("org.apache.camel:type=endpoints,*", Core.onSuccess(function (response) {
                            angular.forEach(response, function (objectName) {
                                var endpoint = getOrCreateEndpoint(objectName);
                                var camelContext = getOrCreateCamelContext(null, objectName);
                                addLink(camelContext, endpoint, "endpoint");
                            });
                            graphModelUpdated();
                        }));
                    }
                }
                function getOrCreateCamelContext(contextId, contextMBean) {
                    if (contextMBean === void 0) { contextMBean = null; }
                    var answer = null;
                    if (matchesContextId(contextId)) {
                        if (!contextMBean) {
                            // try guess the mbean name
                            contextMBean = Camel.jmxDomain + ':context=' + contextId + ',type=context,name="' + contextId + '"';
                        }
                        if (!contextId && contextMBean) {
                            var details = Core.parseMBean(contextMBean);
                            var attributes = details['attributes'];
                            contextId = attributes["context"];
                        }
                        var contextAttributes = {
                            contextId: contextId
                        };
                        if ($scope.viewSettings.context) {
                            answer = getOrAddNode("context", idPrefix + contextId, contextAttributes, function () {
                                return {
                                    name: contextId,
                                    typeLabel: "CamelContext",
                                    container: container,
                                    objectName: contextMBean,
                                    jolokia: containerJolokia,
                                    popup: {
                                        title: "CamelContext: " + contextId,
                                        content: ""
                                    }
                                };
                            });
                        }
                        // lets try out the new Camel 2.13 API to find endpoint usage...
                        containerJolokia.execute(contextMBean, "createRouteStaticEndpointJson", Core.onSuccess(function (response) {
                            if (angular.isString(response)) {
                                var text = response;
                                var data = null;
                                try {
                                    data = JSON.parse(text);
                                }
                                catch (e) {
                                    // there's a bug in 2.13.0 - lets try trimming the final '}' to see if that makes it valid json ;)
                                    text = Core.trimTrailing(text.trim(), "}");
                                    try {
                                        data = JSON.parse(text);
                                    }
                                    catch (e2) {
                                        Camel.log.debug("Ignored invalid json: " + e + " from text: " + response);
                                    }
                                }
                            }
                            if (data) {
                                angular.forEach(data["routes"], function (routeData, routeId) {
                                    angular.forEach(routeData["inputs"], function (inputEndpoint) {
                                        var inputUri = inputEndpoint["uri"];
                                        if (inputUri) {
                                            var route = getOrCreateRoute(null, {}, false, routeId, contextId, answer);
                                            var input = getOrCreateEndpoint(null, inputUri, contextId);
                                            var nextStep = route;
                                            addLink(input, route, "endpoint");
                                            angular.forEach(routeData["outputs"], function (outputEndpoint) {
                                                var outputUri = outputEndpoint["uri"];
                                                if (outputUri) {
                                                    var output = getOrCreateEndpoint(null, outputUri, contextId);
                                                    addLink(nextStep, output, "endpoint");
                                                    nextStep = output;
                                                }
                                            });
                                        }
                                    });
                                });
                                Camel.log.info("Updating graph model!");
                                graphModelUpdated();
                            }
                        }, {
                            error: function (response) {
                                // probably a pre-2.13 Camel implementation so lets use the old way
                                if (!startedLoadMetaDataFromEndpointMBeans) {
                                    startedLoadMetaDataFromEndpointMBeans = true;
                                    loadMetaDataFromEndpointMBeans();
                                }
                            }
                        }));
                    }
                    return answer;
                }
                containerJolokia.search("org.apache.camel:type=context,*", Core.onSuccess(function (response) {
                    angular.forEach(response, function (objectName) {
                        var details = Core.parseMBean(objectName);
                        var attributes = details['attributes'];
                        var contextId = attributes["context"];
                        var uri = Core.trimQuotes(attributes["name"]);
                        getOrCreateCamelContext(contextId, objectName);
                    });
                    //graphModelUpdated();
                }));
            }
        }
        function graphModelUpdated() {
            $scope.graph = graphBuilder.buildGraph();
            Core.$apply($scope);
        }
        function getOrAddNode(typeName, id, properties, createFn) {
            var node = null;
            if (id) {
                var nodeId = typeName + ":" + id;
                node = graphBuilder.getNode(nodeId);
                if (!node) {
                    var nodeValues = createFn();
                    node = angular.copy(properties);
                    angular.forEach(nodeValues, function (value, key) { return node[key] = value; });
                    node['id'] = nodeId;
                    if (!node['type']) {
                        node['type'] = typeName;
                    }
                    if (!node['name']) {
                        node['name'] = id;
                    }
                    if (node) {
                        var size = $scope.shapeSize[typeName];
                        if (size && !node['size']) {
                            node['size'] = size;
                        }
                        if (!node['summary']) {
                            node['summary'] = node['popup'] || "";
                        }
                        if (!$scope.viewSettings.popup) {
                            delete node['popup'];
                        }
                        if (!$scope.viewSettings.label) {
                            delete node['name'];
                        }
                        // lets not add nodes which are defined as being disabled
                        var enabled = $scope.viewSettings[typeName];
                        if (enabled || !angular.isDefined(enabled)) {
                            //log.info("==== Adding node " + nodeId + " of type + " + typeName);
                            graphBuilder.addNode(node);
                        }
                        else {
                        }
                    }
                }
            }
            return node;
        }
        function addLink(object1, object2, linkType) {
            if (object1 && object2) {
                addLinkIds(object1.id, object2.id, linkType);
            }
        }
        function addLinkIds(id1, id2, linkType) {
            if (id1 && id2) {
                //log.info("==== Linking " + id1 + " to " + id2);
                graphBuilder.addLink(id1, id2, linkType);
            }
        }
        /**
         * Avoid the JMX type property clashing with the ForceGraph type property; used for associating css classes with nodes on the graph
         *
         * @param properties
         */
        function renameTypeProperty(properties) {
            properties.mbeanType = properties['type'];
            delete properties['type'];
        }
        function configureEndpointProperties(properties) {
            renameTypeProperty(properties);
            var destinationType = properties.destinationType || "Queue";
            var typeName = destinationType.toLowerCase();
            properties.isQueue = !typeName.startsWith("t");
            properties['destType'] = typeName;
        }
    }]);
})(Camel || (Camel = {}));

var Camel;
(function (Camel) {
    Camel.jmsHeaderSchema = {
        definitions: {
            headers: {
                properties: {
                    JMSCorrelationID: {
                        type: "java.lang.String"
                    },
                    JMSDeliveryMode: {
                        "type": "string",
                        "enum": [
                            "PERSISTENT",
                            "NON_PERSISTENT"
                        ]
                    },
                    JMSDestination: {
                        type: "javax.jms.Destination"
                    },
                    JMSExpiration: {
                        type: "long"
                    },
                    JMSPriority: {
                        type: "int"
                    },
                    JMSReplyTo: {
                        type: "javax.jms.Destination"
                    },
                    JMSType: {
                        type: "java.lang.String"
                    },
                    JMSXGroupId: {
                        type: "java.lang.String"
                    },
                    AMQ_SCHEDULED_CRON: {
                        type: "java.lang.String"
                    },
                    AMQ_SCHEDULED_DELAY: {
                        type: "java.lang.String"
                    },
                    AMQ_SCHEDULED_PERIOD: {
                        type: "java.lang.String"
                    },
                    AMQ_SCHEDULED_REPEAT: {
                        type: "java.lang.String"
                    }
                }
            },
            "javax.jms.Destination": {
                type: "java.lang.String"
            }
        }
    };
})(Camel || (Camel = {}));

/// <reference path="../../includes.ts"/>
/// <reference path="camelPlugin.ts"/>
/**
 * @module Camel
 */
var Camel;
(function (Camel) {
    Camel._module.controller("Camel.PreferencesController", ["$scope", "localStorage", function ($scope, localStorage) {
        Core.initPreferenceScope($scope, localStorage, {
            'camelIgnoreIdForLabel': {
                'value': false,
                'converter': Core.parseBooleanValue
            },
            'camelMaximumLabelWidth': {
                'value': Camel.defaultMaximumLabelWidth,
                'converter': parseInt
            },
            'camelMaximumTraceOrDebugBodyLength': {
                'value': Camel.defaultCamelMaximumTraceOrDebugBodyLength,
                'converter': parseInt
            },
            'camelTraceOrDebugIncludeStreams': {
                'value': Camel.defaultCamelTraceOrDebugIncludeStreams,
                'converter': Core.parseBooleanValue
            },
            'camelRouteMetricMaxSeconds': {
                'value': Camel.defaultCamelRouteMetricMaxSeconds,
                'converter': parseInt
            }
        });
    }]);
})(Camel || (Camel = {}));

/// <reference path="../../includes.ts"/>
/// <reference path="camelPlugin.ts"/>
var Camel;
(function (Camel) {
    Camel._module.controller("Camel.ProfileRouteController", ["$scope", "$location", "workspace", "jolokia", function ($scope, $location, workspace, jolokia) {
        $scope.data = [];
        $scope.calcManually = true;
        $scope.icons = {};
        $scope.selectedRouteId = "";
        var columnDefs = [
            {
                field: 'id',
                displayName: 'Id',
                cellTemplate: '<div class="ngCellText" ng-bind-html-unsafe="rowIcon(row.entity.id)"></div>',
                cellFilter: null,
                width: "**",
                resizable: true
            },
            {
                field: 'count',
                displayName: 'Count',
                cellFilter: null,
                width: "*",
                resizable: true
            },
            {
                field: 'last',
                displayName: 'Last',
                cellFilter: null,
                width: "*",
                resizable: true
            },
            {
                field: 'delta',
                displayName: 'Delta',
                cellFilter: null,
                width: "*",
                resizable: true
            },
            {
                field: 'mean',
                displayName: 'Mean',
                cellFilter: null,
                width: "*",
                resizable: true
            },
            {
                field: 'min',
                displayName: 'Min',
                cellFilter: null,
                width: "*",
                resizable: true
            },
            {
                field: 'max',
                displayName: 'Max',
                cellFilter: null,
                width: "*",
                resizable: true
            },
            {
                field: 'total',
                displayName: 'Total',
                cellFilter: null,
                width: "*",
                resizable: true
            },
            {
                field: 'self',
                displayName: 'Self',
                cellFilter: null,
                width: "*",
                resizable: true
            }
        ];
        $scope.rowIcon = function (id) {
            var entry = $scope.icons[id];
            if (entry) {
                return entry.img + " " + id;
            }
            else {
                return id;
            }
        };
        $scope.gridOptions = {
            data: 'data',
            displayFooter: true,
            displaySelectionCheckbox: false,
            canSelectRows: false,
            enableSorting: false,
            columnDefs: columnDefs,
            filterOptions: {
                filterText: ''
            }
        };
        var populateProfileMessages = function (response) {
            var updatedData = [];
            // its xml structure so we need to parse it
            var xml = response.value;
            if (angular.isString(xml)) {
                // lets parse the XML DOM here...
                var doc = $.parseXML(xml);
                var routeMessages = $(doc).find("routeStat");
                routeMessages.each(function (idx, message) {
                    var messageData = {
                        id: {},
                        count: {},
                        last: {},
                        delta: {},
                        mean: {},
                        min: {},
                        max: {},
                        total: {},
                        self: {}
                    };
                    // compare counters, as we only update if we have new data
                    messageData.id = message.getAttribute("id");
                    var total = 0;
                    total += +message.getAttribute("exchangesCompleted");
                    total += +message.getAttribute("exchangesFailed");
                    messageData.count = total;
                    messageData.last = message.getAttribute("lastProcessingTime");
                    // delta is only avail from Camel 2.11 onwards
                    var delta = message.getAttribute("deltaProcessingTime");
                    if (delta) {
                        messageData.delta = delta;
                    }
                    else {
                        messageData.delta = 0;
                    }
                    messageData.mean = message.getAttribute("meanProcessingTime");
                    messageData.min = message.getAttribute("minProcessingTime");
                    messageData.max = message.getAttribute("maxProcessingTime");
                    messageData.total = message.getAttribute("totalProcessingTime");
                    // self is pre calculated from Camel 2.11 onwards
                    var self = message.getAttribute("selfProcessingTime");
                    if (self) {
                        messageData.self = self;
                    }
                    else {
                        // we need to calculate this manually
                        $scope.calcManually = true;
                        messageData.self = "0";
                    }
                    updatedData.push(messageData);
                });
                var processorMessages = $(doc).find("processorStat");
                processorMessages.each(function (idx, message) {
                    var messageData = {
                        id: {},
                        count: {},
                        last: {},
                        delta: {},
                        mean: {},
                        min: {},
                        max: {},
                        total: {},
                        self: {}
                    };
                    messageData.id = message.getAttribute("id");
                    var total = 0;
                    total += +message.getAttribute("exchangesCompleted");
                    total += +message.getAttribute("exchangesFailed");
                    messageData.count = total;
                    messageData.last = message.getAttribute("lastProcessingTime");
                    // delta is only avail from Camel 2.11 onwards
                    var delta = message.getAttribute("deltaProcessingTime");
                    if (delta) {
                        messageData.delta = delta;
                    }
                    else {
                        messageData.delta = 0;
                    }
                    messageData.mean = message.getAttribute("meanProcessingTime");
                    messageData.min = message.getAttribute("minProcessingTime");
                    messageData.max = message.getAttribute("maxProcessingTime");
                    // total time for processors is pre calculated as accumulated from Camel 2.11 onwards
                    var apt = message.getAttribute("accumulatedProcessingTime");
                    if (apt) {
                        messageData.total = apt;
                    }
                    else {
                        messageData.total = "0";
                    }
                    // self time for processors is their total time
                    messageData.self = message.getAttribute("totalProcessingTime");
                    updatedData.push(messageData);
                });
            }
            // for Camel 2.10 or older we need to run through the data and calculate the self/total times manually
            if ($scope.calcManually) {
                // sort the data accordingly to order in the icons map
                updatedData.sort(function (e1, e2) {
                    var entry1 = $scope.icons[e1.id];
                    var entry2 = $scope.icons[e2.id];
                    if (entry1 && entry2) {
                        return entry1.index - entry2.index;
                    }
                    else {
                        return 0;
                    }
                });
                var accTotal = 0;
                updatedData.reverse().forEach(function (data, idx) {
                    // update accTotal with self time
                    if (idx < updatedData.length - 1) {
                        // each processor should have the total updated with the accumulated total
                        accTotal += +data.self;
                        data.total = accTotal;
                    }
                    else {
                        // the last row is the route, which should have self calculated as follows
                        data.self = +(data.total - accTotal);
                        // just to be safe we dont want negative values self value for the route
                        if (data.self < 0) {
                            data.self = 0;
                        }
                    }
                });
                // reverse back again
                updatedData.reverse();
            }
            // TODO: need a way to update data without flickering
            // if we do as below with the forEach then the data does not update
            // replace data with updated data
            $scope.data = updatedData;
            Core.$apply($scope);
        };
        // function to trigger reloading page
        $scope.onResponse = function (response) {
            //console.log("got response: " + response);
            loadData();
        };
        $scope.$watch('workspace.tree', function () {
            // if the JMX tree is reloaded its probably because a new MBean has been added or removed
            // so lets reload, asynchronously just in case
            setTimeout(loadData, 50);
        });
        function initIdToIcon() {
            console.log("initializing id and icons");
            $scope.icons = {};
            var routeXml = Core.pathGet(workspace.selection, ["routeXmlNode"]);
            if (routeXml) {
                // add route id first
                var entry = {
                    img: "",
                    index: 0
                };
                entry.index = -1;
                entry.img = "<img src='img/icons/camel/camel_route.png'>";
                $scope.icons[$scope.selectedRouteId] = entry;
                // then each processor id and icons
                $(routeXml).find('*').each(function (idx, element) {
                    var id = element.getAttribute("id");
                    if (id) {
                        var entry = {
                            img: "",
                            index: 0
                        };
                        entry.index = idx;
                        var icon = Camel.getRouteNodeIcon(element);
                        if (icon) {
                            entry.img = "<img src='" + icon + "'>";
                        }
                        else {
                            entry.img = "";
                        }
                        $scope.icons[id] = entry;
                    }
                });
            }
        }
        function loadData() {
            console.log("Loading Camel route profile data...");
            $scope.selectedRouteId = Camel.getSelectedRouteId(workspace);
            var routeMBean = Camel.getSelectionRouteMBean(workspace, $scope.selectedRouteId);
            console.log("Selected route is " + $scope.selectedRouteId);
            if (Camel.isCamelVersionEQGT(2, 11, workspace, jolokia)) {
                // this is Camel 2.11 or better so we dont need to calculate data manually
                console.log("Camel 2.11 or better detected");
                $scope.calcManually = false;
            }
            else {
                console.log("Camel 2.10 or older detected");
                $scope.calcManually = true;
            }
            initIdToIcon();
            console.log("Initialized icons, with " + $scope.icons.length + " icons");
            // schedule update the profile data, based on the configured interval
            // TOOD: the icons is not initialized the first time, for some reason, the routeXmlNode is empty/undefined
            // TODO: have cellFilter with bar grey-scale for highlighting the scales between the numbers
            // TODO: have the icons indent, there is some CSS ninja crack to do this
            var query = { type: 'exec', mbean: routeMBean, operation: 'dumpRouteStatsAsXml(boolean,boolean)', arguments: [false, true] };
            scopeStoreJolokiaHandle($scope, jolokia, jolokia.register(populateProfileMessages, query));
        }
    }]);
})(Camel || (Camel = {}));

/// <reference path="../../includes.ts"/>
/// <reference path="camelPlugin.ts"/>
var Camel;
(function (Camel) {
    Camel._module.controller("Camel.PropertiesController", ["$scope", "workspace", function ($scope, workspace) {
        $scope.viewTemplate = null;
        $scope.schema = _apacheCamelModel;
        $scope.$on("$routeChangeSuccess", function (event, current, previous) {
            // lets do this asynchronously to avoid Error: $digest already in progress
            setTimeout(updateData, 50);
        });
        $scope.$watch('workspace.selection', function () {
            if (workspace.moveIfViewInvalid())
                return;
            updateData();
        });
        function updateData() {
            var routeXmlNode = Camel.getSelectedRouteNode(workspace);
            $scope.nodeData = Camel.getRouteNodeJSON(routeXmlNode);
            if (routeXmlNode) {
                var nodeName = routeXmlNode.nodeName;
                $scope.model = Camel.getCamelSchema(nodeName);
                if ($scope.model) {
                    console.log("data is: " + JSON.stringify($scope.nodeData, null, "  "));
                    console.log("model schema is: " + JSON.stringify($scope.model, null, "  "));
                    $scope.viewTemplate = "app/camel/html/nodePropertiesView.html";
                }
            }
        }
    }]);
})(Camel || (Camel = {}));

/// <reference path="../../includes.ts"/>
/// <reference path="camelPlugin.ts"/>
var Camel;
(function (Camel) {
    Camel._module.controller("Camel.RestServiceController", ["$scope", "$location", "workspace", "jolokia", function ($scope, $location, workspace, jolokia) {
        $scope.data = [];
        $scope.selectedMBean = null;
        $scope.mbeanAttributes = {};
        var columnDefs = [
            {
                field: 'url',
                displayName: 'Absolute Url',
                cellFilter: null,
                width: "*",
                resizable: true
            },
            {
                field: 'baseUrl',
                displayName: 'Base Url',
                cellFilter: null,
                width: "*",
                resizable: true
            },
            {
                field: 'basePath',
                displayName: 'Base Path',
                cellFilter: null,
                width: "*",
                resizable: true
            },
            {
                field: 'uriTemplate',
                displayName: 'Uri Template',
                cellFilter: null,
                width: "*",
                resizable: true
            },
            {
                field: 'method',
                displayName: 'Method',
                cellFilter: null,
                width: "*",
                resizable: true
            },
            {
                field: 'consumes',
                displayName: 'Consumes',
                cellFilter: null,
                width: "*",
                resizable: true
            },
            {
                field: 'produces',
                displayName: 'Produces',
                cellFilter: null,
                width: "*",
                resizable: true
            },
            {
                field: 'inType',
                displayName: 'Input Type',
                cellFilter: null,
                width: "*",
                resizable: true
            },
            {
                field: 'outType',
                displayName: 'Output Type',
                cellFilter: null,
                width: "*",
                resizable: true
            },
            {
                field: 'state',
                displayName: 'State',
                cellFilter: null,
                width: "*",
                resizable: true
            },
            {
                field: 'routeId',
                displayName: 'Route Id',
                cellFilter: null,
                width: "*",
                resizable: true
            },
            {
                field: 'description',
                displayName: 'Description',
                cellFilter: null,
                width: "*",
                resizable: true
            }
        ];
        $scope.gridOptions = {
            data: 'data',
            displayFooter: true,
            displaySelectionCheckbox: false,
            canSelectRows: false,
            enableSorting: true,
            columnDefs: columnDefs,
            selectedItems: [],
            filterOptions: {
                filterText: ''
            }
        };
        function onRestRegistry(response) {
            var obj = response.value;
            if (obj) {
                // the JMX tabular data has 2 indexes so we need to dive 2 levels down to grab the data
                var arr = [];
                for (var key in obj) {
                    var values = obj[key];
                    for (var v in values) {
                        var entry = values[v];
                        arr.push({
                            url: entry.url,
                            baseUrl: entry.baseUrl,
                            basePath: entry.basePath,
                            uriTemplate: entry.uriTemplate,
                            method: entry.method,
                            consumes: entry.consumes,
                            produces: entry.produces,
                            inType: entry.inType,
                            outType: entry.outType,
                            state: entry.state,
                            routeId: entry.routeId,
                            description: entry.description
                        });
                    }
                }
                arr = arr.sortBy("url");
                $scope.data = arr;
                // okay we have the data then set the selected mbean which allows UI to display data
                $scope.selectedMBean = response.request.mbean;
            }
            else {
                // set the mbean to a value so the ui can get updated
                $scope.selectedMBean = "true";
            }
            // ensure web page is updated
            Core.$apply($scope);
        }
        $scope.renderIcon = function (state) {
            return Camel.iconClass(state);
        };
        function loadRestRegistry() {
            console.log("Loading RestRegistry data...");
            var mbean = Camel.getSelectionCamelRestRegistry(workspace);
            if (mbean) {
                jolokia.request({ type: 'exec', mbean: mbean, operation: 'listRestServices' }, Core.onSuccess(onRestRegistry));
            }
        }
        // load data
        loadRestRegistry();
    }]);
})(Camel || (Camel = {}));

/// <reference path="../../includes.ts"/>
/// <reference path="camelPlugin.ts"/>
var Camel;
(function (Camel) {
    Camel._module.controller("Camel.RouteMetricsController", ["$scope", "$location", "workspace", "jolokia", "metricsWatcher", function ($scope, $location, workspace, jolokia, metricsWatcher) {
        var log = Logger.get("Camel");
        $scope.maxSeconds = Camel.routeMetricMaxSeconds(localStorage);
        $scope.filterText = null;
        $scope.initDone = false;
        $scope.metricDivs = [];
        $scope.filterByRoute = function (div) {
            log.debug("Filter by route " + div);
            var match = Core.matchFilterIgnoreCase(div.routeId, $scope.filterText);
            if (!match) {
                // hide using CSS style
                return "display: none;";
            }
            else {
                return "";
            }
        };
        function populateRouteStatistics(response) {
            var obj = response.value;
            if (obj) {
                // turn into json javascript object which metrics watcher requires
                var json = JSON.parse(obj);
                if (!$scope.initDone) {
                    // figure out which routes we have
                    var meters = json['timers'];
                    var counter = 0;
                    if (meters != null) {
                        for (var v in meters) {
                            var key = v;
                            var lastDot = key.lastIndexOf(".");
                            var className = key.substr(0, lastDot);
                            var metricsName = key.substr(lastDot + 1);
                            var firstColon = key.indexOf(":");
                            // compute route id from the key, which is text after the 1st colon, and the last dot
                            var routeId = key.substr(firstColon + 1);
                            lastDot = routeId.lastIndexOf(".");
                            if (lastDot > 0) {
                                routeId = routeId.substr(0, lastDot);
                            }
                            var entry = meters[v];
                            var div = "timer-" + counter;
                            $scope.metricDivs.push({
                                id: div,
                                routeId: routeId
                            });
                            counter++;
                            log.info("Added timer: " + div + " (" + className + "." + metricsName + ") for route: " + routeId + " with max seconds: " + $scope.maxSeconds);
                            metricsWatcher.addTimer(div, className, metricsName, $scope.maxSeconds, routeId, "Histogram", $scope.maxSeconds * 1000);
                        }
                        // ensure web page is updated at this point, as we need the metricDivs in the HTML before we call init graphs later
                        log.info("Pre-init graphs");
                        Core.$apply($scope);
                    }
                    log.info("Init graphs");
                    metricsWatcher.initGraphs();
                }
                $scope.initDone = true;
                // update graphs
                log.debug("Updating graphs: " + json);
                metricsWatcher.updateGraphs(json);
            }
            $scope.initDone = true;
            // ensure web page is updated
            Core.$apply($scope);
        }
        // function to trigger reloading page
        $scope.onResponse = function (response) {
            loadData();
        };
        $scope.$watch('workspace.tree', function () {
            // if the JMX tree is reloaded its probably because a new MBean has been added or removed
            // so lets reload, asynchronously just in case
            setTimeout(loadData, 50);
        });
        function loadData() {
            log.info("Loading RouteMetrics data...");
            // pre-select filter if we have selected a route
            var routeId = Camel.getSelectedRouteId(workspace);
            if (routeId != null) {
                $scope.filterText = routeId;
            }
            var mbean = Camel.getSelectionCamelRouteMetrics(workspace);
            if (mbean) {
                var query = { type: 'exec', mbean: mbean, operation: 'dumpStatisticsAsJson' };
                scopeStoreJolokiaHandle($scope, jolokia, jolokia.register(populateRouteStatistics, query));
            }
            else {
                $scope.initDone = true;
                // ensure web page is updated
                Core.$apply($scope);
            }
        }
    }]);
})(Camel || (Camel = {}));

/// <reference path="../../includes.ts"/>
/// <reference path="camelPlugin.ts"/>
var Camel;
(function (Camel) {
    Camel._module.controller("Camel.RouteController", ["$scope", "$routeParams", "$element", "$timeout", "workspace", "$location", "jolokia", "localStorage", function ($scope, $routeParams, $element, $timeout, workspace, $location, jolokia, localStorage) {
        var log = Logger.get("Camel");
        $scope.routes = [];
        $scope.routeNodes = {};
        // if we are in dashboard then $routeParams may be null
        if ($routeParams != null) {
            $scope.contextId = $routeParams["contextId"];
            $scope.routeId = Core.trimQuotes($routeParams["routeId"]);
            $scope.isJmxTab = !$routeParams["contextId"] || !$routeParams["routeId"];
        }
        $scope.camelIgnoreIdForLabel = Camel.ignoreIdForLabel(localStorage);
        $scope.camelMaximumLabelWidth = Camel.maximumLabelWidth(localStorage);
        var updateRoutes = Core.throttled(doUpdateRoutes, 1000);
        // lets delay a little updating the routes to avoid timing issues where we've not yet
        // fully loaded the workspace and/or the XML model
        var delayUpdatingRoutes = 300;
        $scope.$on("$routeChangeSuccess", function (event, current, previous) {
            // lets do this asynchronously to avoid Error: $digest already in progress
            $timeout(updateRoutes, delayUpdatingRoutes);
        });
        $scope.$watch('workspace.selection', function () {
            if ($scope.isJmxTab && workspace.moveIfViewInvalid())
                return;
            $timeout(updateRoutes, delayUpdatingRoutes);
        });
        $scope.$on('jmxTreeUpdated', function () {
            $timeout(updateRoutes, delayUpdatingRoutes);
        });
        $scope.$watch('nodeXmlNode', function () {
            if ($scope.isJmxTab && workspace.moveIfViewInvalid())
                return;
            $timeout(updateRoutes, delayUpdatingRoutes);
        });
        function doUpdateRoutes() {
            var routeXmlNode = null;
            if (!$scope.ignoreRouteXmlNode) {
                routeXmlNode = Camel.getSelectedRouteNode(workspace);
                if (!routeXmlNode) {
                    routeXmlNode = $scope.nodeXmlNode;
                }
                if (routeXmlNode && routeXmlNode.localName !== "route") {
                    var wrapper = document.createElement("route");
                    wrapper.appendChild(routeXmlNode.cloneNode(true));
                    routeXmlNode = wrapper;
                }
            }
            $scope.mbean = Camel.getSelectionCamelContextMBean(workspace);
            if (!$scope.mbean && $scope.contextId) {
                $scope.mbean = Camel.getCamelContextMBean(workspace, $scope.contextId);
            }
            if (routeXmlNode) {
                // lets show the remaining parts of the diagram of this route node
                $scope.nodes = {};
                var nodes = [];
                var links = [];
                $scope.processorTree = Camel.camelProcessorMBeansById(workspace);
                Camel.addRouteXmlChildren($scope, routeXmlNode, nodes, links, null, 0, 0);
                showGraph(nodes, links);
            }
            else if ($scope.mbean) {
                jolokia.request({ type: 'exec', mbean: $scope.mbean, operation: 'dumpRoutesAsXml()' }, Core.onSuccess(populateTable));
            }
            else {
                log.info("No camel context bean! Selection: " + workspace.selection);
            }
        }
        var populateTable = function (response) {
            var data = response.value;
            // routes is the xml data of the routes
            $scope.routes = data;
            // nodes and routeNodes is the GUI nodes for the processors and routes shown in the diagram
            $scope.nodes = {};
            $scope.routeNodes = {};
            var nodes = [];
            var links = [];
            var selectedRouteId = $scope.routeId;
            if (!selectedRouteId) {
                selectedRouteId = Camel.getSelectedRouteId(workspace);
            }
            if (data) {
                var doc = $.parseXML(data);
                $scope.processorTree = Camel.camelProcessorMBeansById(workspace);
                Camel.loadRouteXmlNodes($scope, doc, selectedRouteId, nodes, links, getWidth());
                showGraph(nodes, links);
            }
            else {
                console.log("No data from route XML!");
            }
            Core.$apply($scope);
        };
        var postfix = " selected";
        function isSelected(node) {
            if (node) {
                var className = node.getAttribute("class");
                return className && className.endsWith(postfix);
            }
            return false;
        }
        function setSelected(node, flag) {
            var answer = false;
            if (node) {
                var className = node.getAttribute("class");
                var selected = className && className.endsWith(postfix);
                if (selected) {
                    className = className.substring(0, className.length - postfix.length);
                }
                else {
                    if (!flag) {
                        // no need to change!
                        return answer;
                    }
                    className = className + postfix;
                    answer = true;
                }
                node.setAttribute("class", className);
            }
            return answer;
        }
        function showGraph(nodes, links) {
            var canvasDiv = $($element);
            var width = getWidth();
            var height = getHeight();
            var svg = canvasDiv.children("svg")[0];
            $scope.graphData = Core.dagreLayoutGraph(nodes, links, width, height, svg);
            var gNodes = canvasDiv.find("g.node");
            gNodes.click(function () {
                var selected = isSelected(this);
                // lets clear all selected flags
                gNodes.each(function (idx, element) {
                    setSelected(element, false);
                });
                var cid = null;
                if (!selected) {
                    cid = this.getAttribute("data-cid");
                    setSelected(this, true);
                }
                $scope.$emit("camel.diagram.selectedNodeId", cid);
                Core.$apply($scope);
            });
            // TODO: https://github.com/hawtio/hawtio/issues/1261
            // we need some kind of right-click menu on d3
            // disabled code below as its work in progress
            /*      gNodes.dblclick(function() {
                    //var allStats = $(doc).find("processorStat");
                    var cid = this.getAttribute("data-cid");
                    log.info("You double clicked " + cid);
            
                    // find the node of the cid we clicked, and then find the folder in the Camel tree
                    // to grab the folder key, which is the nid for the location in the JMX plugin to
                    // view the processor mbean
                    var node = $scope.nodes[cid];
                    if (node) {
                      var pid = node.elementId;
            
                      var processors = camelProcessorMBeansById(workspace);
                      var processor = processors[pid];
                      if (processor) {
                        var key = processor.key;
                        // change url to jmx attributes so we can see the jmx stats for the selected processor
                        $location.search("nid", key);
                        var url = "/jmx/attributes";
                        var href = Core.createHref($location, url);
                        // change path to the jmx attributes page so we can see the processor mbean
                        log.info("Changing to path: " + href);
                        $location.url(href);
                        Core.$apply($scope);
                      }
                    }
                  });*/
            if ($scope.mbean) {
                Core.register(jolokia, $scope, {
                    type: 'exec',
                    mbean: $scope.mbean,
                    operation: 'dumpRoutesStatsAsXml',
                    arguments: [true, true]
                }, Core.onSuccess(statsCallback, { silent: true, error: false }));
            }
            $scope.$emit("camel.diagram.layoutComplete");
            return width;
        }
        function getWidth() {
            var canvasDiv = $($element);
            return canvasDiv.width();
        }
        function getHeight() {
            var canvasDiv = $($element);
            return Camel.getCanvasHeight(canvasDiv);
        }
        function statsCallback(response) {
            var data = response.value;
            if (data) {
                var doc = $.parseXML(data);
                var allStats = $(doc).find("routeStat");
                allStats.each(function (idx, stat) {
                    addTooltipToNode(true, stat);
                });
                var allStats = $(doc).find("processorStat");
                allStats.each(function (idx, stat) {
                    addTooltipToNode(false, stat);
                });
                // now lets try update the graph
                Core.dagreUpdateGraphData($scope.graphData);
            }
            function addTooltipToNode(isRoute, stat) {
                // we could have used a function instead of the boolean isRoute parameter (but sometimes that is easier)
                var id = stat.getAttribute("id");
                var completed = stat.getAttribute("exchangesCompleted");
                var tooltip = "";
                if (id && completed) {
                    var container = isRoute ? $scope.routeNodes : $scope.nodes;
                    var node = container[id];
                    if (!node) {
                        angular.forEach(container, function (value, key) {
                            if (!node && id === value.elementId) {
                                node = value;
                            }
                        });
                    }
                    if (node) {
                        var total = 0 + parseInt(completed);
                        var failed = stat.getAttribute("exchangesFailed");
                        if (failed) {
                            total += parseInt(failed);
                        }
                        var last = stat.getAttribute("lastProcessingTime");
                        var mean = stat.getAttribute("meanProcessingTime");
                        var min = stat.getAttribute("minProcessingTime");
                        var max = stat.getAttribute("maxProcessingTime");
                        tooltip = "last: " + last + " (ms)\nmean: " + mean + " (ms)\nmin: " + min + " (ms)\nmax: " + max + " (ms)";
                        node["counter"] = total;
                        var labelSummary = node["labelSummary"];
                        if (labelSummary) {
                            tooltip = labelSummary + "\n\n" + tooltip;
                        }
                        node["tooltip"] = tooltip;
                    }
                    else {
                    }
                }
            }
        }
    }]);
})(Camel || (Camel = {}));

/// <reference path="../../includes.ts"/>
/// <reference path="camelPlugin.ts"/>
var Camel;
(function (Camel) {
    var DELIVERY_PERSISTENT = "2";
    Camel._module.controller("Camel.SendMessageController", ["$route", "$scope", "$element", "$timeout", "workspace", "jolokia", "localStorage", "$location", "activeMQMessage", function ($route, $scope, $element, $timeout, workspace, jolokia, localStorage, $location, activeMQMessage) {
        var log = Logger.get("Camel");
        log.info("Loaded page!");
        $scope.noCredentials = false;
        $scope.showChoose = false;
        $scope.profileFileNames = [];
        $scope.profileFileNameToProfileId = {};
        $scope.selectedFiles = {};
        $scope.container = {};
        $scope.message = "\n\n\n\n";
        $scope.headers = [];
        // bind model values to search params...
        Core.bindModelToSearchParam($scope, $location, "tab", "subtab", "compose");
        Core.bindModelToSearchParam($scope, $location, "searchText", "q", "");
        // only reload the page if certain search parameters change
        Core.reloadWhenParametersChange($route, $scope, $location);
        $scope.checkCredentials = function () {
            $scope.noCredentials = (Core.isBlank(localStorage['activemqUserName']) || Core.isBlank(localStorage['activemqPassword']));
        };
        if ($location.path().has('activemq')) {
            $scope.localStorage = localStorage;
            $scope.$watch('localStorage.activemqUserName', $scope.checkCredentials);
            $scope.$watch('localStorage.activemqPassword', $scope.checkCredentials);
            //prefill if it's a resent
            if (activeMQMessage.message !== null) {
                $scope.message = activeMQMessage.message.bodyText;
                if (activeMQMessage.message.PropertiesText !== null) {
                    for (var p in activeMQMessage.message.StringProperties) {
                        $scope.headers.push({ name: p, value: activeMQMessage.message.StringProperties[p] });
                    }
                }
            }
            // always reset at the end
            activeMQMessage.message = null;
        }
        $scope.openPrefs = function () {
            $location.search('pref', 'ActiveMQ');
            $scope.$emit("hawtioOpenPrefs");
        };
        var LANGUAGE_FORMAT_PREFERENCE = "defaultLanguageFormat";
        var sourceFormat = workspace.getLocalStorage(LANGUAGE_FORMAT_PREFERENCE) || "javascript";
        // TODO Remove this if possible
        $scope.codeMirror = undefined;
        var options = {
            mode: {
                name: sourceFormat
            },
            // Quick hack to get the codeMirror instance.
            onChange: function (codeMirror) {
                if (!$scope.codeMirror) {
                    $scope.codeMirror = codeMirror;
                }
            }
        };
        $scope.codeMirrorOptions = CodeEditor.createEditorSettings(options);
        $scope.addHeader = function () {
            $scope.headers.push({ name: "", value: "" });
            // lets set the focus to the last header
            if ($element) {
                $timeout(function () {
                    var lastHeader = $element.find("input.headerName").last();
                    lastHeader.focus();
                }, 100);
            }
        };
        $scope.removeHeader = function (header) {
            $scope.headers = $scope.headers.remove(header);
        };
        $scope.defaultHeaderNames = function () {
            var answer = [];
            function addHeaderSchema(schema) {
                angular.forEach(schema.definitions.headers.properties, function (value, name) {
                    answer.push(name);
                });
            }
            if (isJmsEndpoint()) {
                addHeaderSchema(Camel.jmsHeaderSchema);
            }
            if (isCamelEndpoint()) {
                addHeaderSchema(Camel.camelHeaderSchema);
            }
            return answer;
        };
        $scope.$watch('workspace.selection', function () {
            // if the current JMX selection does not support sending messages then lets redirect the page
            workspace.moveIfViewInvalid();
            if (Fabric.fabricCreated(workspace)) {
                loadProfileConfigurationFiles();
            }
        });
        /* save the sourceFormat in preferences for later
         * Note, this would be controller specific preferences and not the global, overriding, preferences */
        // TODO Use ng-selected="changeSourceFormat()" - Although it seemed to fire multiple times..
        $scope.$watch('codeMirrorOptions.mode.name', function (newValue, oldValue) {
            workspace.setLocalStorage(LANGUAGE_FORMAT_PREFERENCE, newValue);
        });
        var sendWorked = function () {
            $scope.message = "";
            Core.notification("success", "Message sent!");
        };
        $scope.autoFormat = function () {
            setTimeout(function () {
                CodeEditor.autoFormatEditor($scope.codeMirror);
            }, 50);
        };
        $scope.sendMessage = function () {
            var body = $scope.message;
            doSendMessage(body, sendWorked);
        };
        function doSendMessage(body, onSendCompleteFn) {
            var selection = workspace.selection;
            if (selection) {
                var mbean = selection.objectName;
                if (mbean) {
                    var headers = null;
                    if ($scope.headers.length) {
                        headers = {};
                        angular.forEach($scope.headers, function (object) {
                            var key = object.name;
                            if (key) {
                                headers[key] = object.value;
                            }
                        });
                        log.info("About to send headers: " + JSON.stringify(headers));
                    }
                    var callback = Core.onSuccess(onSendCompleteFn);
                    if (selection.domain === "org.apache.camel") {
                        var target = Camel.getContextAndTargetEndpoint(workspace);
                        var uri = target['uri'];
                        mbean = target['mbean'];
                        if (mbean && uri) {
                            // if we are running Camel 2.14 we can check if its posible to send to the endppoint
                            var ok = true;
                            if (Camel.isCamelVersionEQGT(2, 14, workspace, jolokia)) {
                                var reply = jolokia.execute(mbean, "canSendToEndpoint(java.lang.String)", uri);
                                if (!reply) {
                                    Core.notification("warning", "Camel does not support sending to this endpoint.");
                                    ok = false;
                                }
                            }
                            if (ok) {
                                if (headers) {
                                    jolokia.execute(mbean, "sendBodyAndHeaders(java.lang.String, java.lang.Object, java.util.Map)", uri, body, headers, callback);
                                }
                                else {
                                    jolokia.execute(mbean, "sendStringBody(java.lang.String, java.lang.String)", uri, body, callback);
                                }
                            }
                        }
                        else {
                            if (!mbean) {
                                Core.notification("error", "Could not find CamelContext MBean!");
                            }
                            else {
                                Core.notification("error", "Failed to determine endpoint name!");
                            }
                            log.debug("Parsed context and endpoint: ", target);
                        }
                    }
                    else {
                        var user = localStorage["activemqUserName"];
                        var pwd = localStorage["activemqPassword"];
                        // AMQ is sending non persistent by default, so make sure we tell to sent persistent by default
                        if (!headers) {
                            headers = {};
                        }
                        if (!headers["JMSDeliveryMode"]) {
                            headers["JMSDeliveryMode"] = DELIVERY_PERSISTENT;
                        }
                        jolokia.execute(mbean, "sendTextMessage(java.util.Map, java.lang.String, java.lang.String, java.lang.String)", headers, body, user, pwd, callback);
                    }
                }
            }
        }
        $scope.fileSelection = function () {
            var answer = [];
            angular.forEach($scope.selectedFiles, function (value, key) {
                if (value) {
                    answer.push(key);
                }
            });
            return answer;
        };
        $scope.sendSelectedFiles = function () {
            var filesToSend = $scope.fileSelection();
            var fileCount = filesToSend.length;
            var version = $scope.container.versionId || "1.0";
            function onSendFileCompleted(response) {
                if (filesToSend.length) {
                    var fileName = filesToSend.pop();
                    if (fileName) {
                        // lets load the file data...
                        var profile = $scope.profileFileNameToProfileId[fileName];
                        if (profile) {
                            var body = Fabric.getConfigFile(jolokia, version, profile, fileName);
                            if (!body) {
                                log.warn("No body for message " + fileName);
                                body = "";
                            }
                            doSendMessage(body, onSendFileCompleted);
                        }
                    }
                }
                else {
                    var text = Core.maybePlural(fileCount, "Message") + " sent!";
                    Core.notification("success", text);
                }
            }
            // now lets start sending
            onSendFileCompleted(null);
        };
        function isCamelEndpoint() {
            // TODO check for the camel or if its an activemq endpoint
            return true;
        }
        function isJmsEndpoint() {
            // TODO check for the jms/activemq endpoint in camel or if its an activemq endpoint
            return true;
        }
        function loadProfileConfigurationFiles() {
            if (Fabric.fabricCreated(workspace)) {
                $scope.container = Fabric.getCurrentContainer(jolokia, ['versionId', 'profileIds']);
                jolokia.execute(Fabric.managerMBean, "currentContainerConfigurationFiles", Core.onSuccess(onFabricConfigFiles));
            }
        }
        function onFabricConfigFiles(response) {
            $scope.profileFileNameToProfileId = response;
            // we only want files from the data dir
            $scope.profileFileNames = Object.keys(response).filter(function (key) {
                return key.toLowerCase().startsWith('data/');
            }).sort();
            $scope.showChoose = $scope.profileFileNames.length ? true : false;
            $scope.selectedFiles = {};
            Core.$apply($scope);
        }
    }]);
})(Camel || (Camel = {}));

/// <reference path="../../includes.ts"/>
/// <reference path="camelPlugin.ts"/>
var Camel;
(function (Camel) {
    Camel._module.controller("Camel.SourceController", ["$scope", "workspace", function ($scope, workspace) {
        $scope.$on("$routeChangeSuccess", function (event, current, previous) {
            // lets do this asynchronously to avoid Error: $digest already in progress
            setTimeout(updateRoutes, 50);
        });
        $scope.$watch('workspace.selection', function () {
            if (workspace.moveIfViewInvalid())
                return;
            updateRoutes();
        });
        $scope.mode = 'xml';
        function getSource(routeXmlNode) {
            function removeCrappyHeaders(idx, e) {
                var answer = e.getAttribute("customId");
                if (e.nodeName === 'route') {
                    // always keep id on <route> element
                    answer = "true";
                }
                if (!answer || answer !== "true") {
                    e.removeAttribute("id");
                }
                // just always remove customId, _cid, and group
                e.removeAttribute("customId");
                e.removeAttribute("_cid");
                e.removeAttribute("group");
            }
            var copy = $(routeXmlNode).clone();
            copy.each(removeCrappyHeaders);
            copy.find("*").each(removeCrappyHeaders);
            var newNode = (copy && copy.length) ? copy[0] : routeXmlNode;
            return Core.xmlNodeToString(newNode);
        }
        function updateRoutes() {
            // did we select a single route
            var routeXmlNode = Camel.getSelectedRouteNode(workspace);
            if (routeXmlNode) {
                $scope.source = getSource(routeXmlNode);
                Core.$apply($scope);
            }
            else {
                // no then try to find the camel context and get all the routes code
                $scope.mbean = Camel.getSelectionCamelContextMBean(workspace);
                if (!$scope.mbean) {
                    // maybe the parent is the camel context folder (when we have selected the routes folder),
                    // then grab the object name from parent
                    var parent = Core.pathGet(workspace, ["selection", "parent"]);
                    if (parent && parent.title === "context") {
                        $scope.mbean = parent.children[0].objectName;
                    }
                }
                if ($scope.mbean) {
                    var jolokia = workspace.jolokia;
                    jolokia.request({ type: 'exec', mbean: $scope.mbean, operation: 'dumpRoutesAsXml()' }, Core.onSuccess(populateTable));
                }
            }
        }
        var populateTable = function (response) {
            var data = response.value;
            var selectedRouteId = Camel.getSelectedRouteId(workspace);
            if (data && selectedRouteId) {
                var doc = $.parseXML(data);
                var routes = $(doc).find('route[id="' + selectedRouteId + '"]');
                if (routes && routes.length) {
                    var selectedRoute = routes[0];
                    // TODO turn into XML?
                    var routeXml = getSource(selectedRoute);
                    if (routeXml) {
                        data = routeXml;
                    }
                }
            }
            $scope.source = data;
            Core.$apply($scope);
        };
        var saveWorked = function () {
            Core.notification("success", "Route updated!");
            // lets clear the cached route XML so we reload the new value
            Camel.clearSelectedRouteNode(workspace);
            updateRoutes();
        };
        $scope.saveRouteXml = function () {
            var routeXml = $scope.source;
            if (routeXml) {
                var decoded = decodeURIComponent(routeXml);
                Camel.log.debug("addOrUpdateRoutesFromXml xml decoded: " + decoded);
                var jolokia = workspace.jolokia;
                var mbean = Camel.getSelectionCamelContextMBean(workspace);
                if (mbean) {
                    jolokia.execute(mbean, "addOrUpdateRoutesFromXml(java.lang.String)", decoded, Core.onSuccess(saveWorked));
                }
                else {
                    Core.notification("error", "Could not find CamelContext MBean!");
                }
            }
        };
    }]);
})(Camel || (Camel = {}));

/// <reference path="../../includes.ts"/>
/// <reference path="camelPlugin.ts"/>
var Camel;
(function (Camel) {
    Camel._module.controller("Camel.TraceRouteController", ["$scope", "workspace", "jolokia", "localStorage", "tracerStatus", function ($scope, workspace, jolokia, localStorage, tracerStatus) {
        var log = Logger.get("CamelTracer");
        $scope.tracing = false;
        $scope.messages = [];
        $scope.graphView = null;
        $scope.tableView = null;
        $scope.mode = 'text';
        $scope.messageDialog = new UI.Dialog();
        $scope.gridOptions = Camel.createBrowseGridOptions();
        $scope.gridOptions.selectWithCheckboxOnly = false;
        $scope.gridOptions.showSelectionCheckbox = false;
        $scope.gridOptions.multiSelect = false;
        $scope.gridOptions.afterSelectionChange = onSelectionChanged;
        $scope.gridOptions.columnDefs.push({
            field: 'toNode',
            displayName: 'To Node'
        });
        $scope.startTracing = function () {
            log.info("Start tracing");
            setTracing(true);
        };
        $scope.stopTracing = function () {
            log.info("Stop tracing");
            setTracing(false);
        };
        $scope.clear = function () {
            log.debug("Clear messages");
            tracerStatus.messages = [];
            $scope.messages = [];
            Core.$apply($scope);
        };
        $scope.$watch('workspace.selection', function () {
            if (workspace.moveIfViewInvalid()) {
                return;
            }
            $scope.messages = tracerStatus.messages;
            reloadTracingFlag();
        });
        // TODO can we share these 2 methods from activemq browse / camel browse / came trace?
        $scope.openMessageDialog = function (message) {
            var idx = Core.pathGet(message, ["rowIndex"]);
            $scope.selectRowIndex(idx);
            if ($scope.row) {
                $scope.mode = CodeEditor.detectTextFormat($scope.row.body);
                $scope.messageDialog.open();
            }
        };
        $scope.selectRowIndex = function (idx) {
            $scope.rowIndex = idx;
            var selected = $scope.gridOptions.selectedItems;
            selected.splice(0, selected.length);
            if (idx >= 0 && idx < $scope.messages.length) {
                $scope.row = $scope.messages[idx];
                if ($scope.row) {
                    selected.push($scope.row);
                }
            }
            else {
                $scope.row = null;
            }
            onSelectionChanged();
        };
        function reloadTracingFlag() {
            $scope.tracing = false;
            // clear any previous polls
            if (tracerStatus.jhandle != null) {
                log.debug("Unregistering jolokia handle");
                jolokia.unregister(tracerStatus.jhandle);
                tracerStatus.jhandle = null;
            }
            var mbean = Camel.getSelectionCamelTraceMBean(workspace);
            if (mbean) {
                $scope.tracing = jolokia.getAttribute(mbean, "Enabled", Core.onSuccess(null));
                if ($scope.tracing) {
                    var traceMBean = mbean;
                    if (traceMBean) {
                        // register callback for doing live update of tracing
                        if (tracerStatus.jhandle === null) {
                            log.debug("Registering jolokia handle");
                            tracerStatus.jhandle = jolokia.register(populateRouteMessages, {
                                type: 'exec',
                                mbean: traceMBean,
                                operation: 'dumpAllTracedMessagesAsXml()',
                                ignoreErrors: true,
                                arguments: []
                            });
                        }
                    }
                    $scope.graphView = "app/camel/html/routes.html";
                    $scope.tableView = "app/camel/html/browseMessages.html";
                }
                else {
                    tracerStatus.messages = [];
                    $scope.messages = [];
                    $scope.graphView = null;
                    $scope.tableView = null;
                }
            }
        }
        function populateRouteMessages(response) {
            log.debug("Populating response " + response);
            // filter messages due CAMEL-7045 but in camel-core
            // see https://github.com/hawtio/hawtio/issues/292
            var selectedRouteId = Camel.getSelectedRouteId(workspace);
            var xml = response.value;
            if (angular.isString(xml)) {
                // lets parse the XML DOM here...
                var doc = $.parseXML(xml);
                var allMessages = $(doc).find("fabricTracerEventMessage");
                if (!allMessages || !allMessages.length) {
                    // lets try find another element name
                    allMessages = $(doc).find("backlogTracerEventMessage");
                }
                allMessages.each(function (idx, message) {
                    var routeId = $(message).find("routeId").text();
                    if (routeId === selectedRouteId) {
                        var messageData = Camel.createMessageFromXml(message);
                        var toNode = $(message).find("toNode").text();
                        if (toNode) {
                            messageData["toNode"] = toNode;
                        }
                        log.debug("Adding new message to trace table with id " + messageData["id"]);
                        $scope.messages.push(messageData);
                    }
                });
                // keep state of the traced messages on tracerStatus
                tracerStatus.messages = $scope.messages;
                Core.$apply($scope);
            }
        }
        function onSelectionChanged() {
            angular.forEach($scope.gridOptions.selectedItems, function (selected) {
                if (selected) {
                    var toNode = selected["toNode"];
                    if (toNode) {
                        // lets highlight the node in the diagram
                        var nodes = d3.select("svg").selectAll("g .node");
                        Camel.highlightSelectedNode(nodes, toNode);
                    }
                }
            });
        }
        function tracingChanged(response) {
            reloadTracingFlag();
            Core.$apply($scope);
        }
        function setTracing(flag) {
            var mbean = Camel.getSelectionCamelTraceMBean(workspace);
            if (mbean) {
                // set max only supported on BacklogTracer
                // (the old fabric tracer does not support max length)
                if (mbean.toString().endsWith("BacklogTracer")) {
                    var max = Camel.maximumTraceOrDebugBodyLength(localStorage);
                    var streams = Camel.traceOrDebugIncludeStreams(localStorage);
                    jolokia.setAttribute(mbean, "BodyMaxChars", max);
                    jolokia.setAttribute(mbean, "BodyIncludeStreams", streams);
                    jolokia.setAttribute(mbean, "BodyIncludeFiles", streams);
                }
                jolokia.setAttribute(mbean, "Enabled", flag, Core.onSuccess(tracingChanged));
            }
        }
        log.info("Re-activating tracer with " + tracerStatus.messages.length + " existing messages");
        $scope.messages = tracerStatus.messages;
        $scope.tracing = tracerStatus.jhandle != null;
    }]);
})(Camel || (Camel = {}));

/// <reference path="../../includes.ts"/>
/// <reference path="camelPlugin.ts"/>
var Camel;
(function (Camel) {
    Camel._module.controller("Camel.TreeHeaderController", ["$scope", "$location", function ($scope, $location) {
        $scope.contextFilterText = '';
        $scope.$watch('contextFilterText', function (newValue, oldValue) {
            if (newValue !== oldValue) {
                $scope.$emit("camel-contextFilterText", newValue);
            }
        });
        $scope.expandAll = function () {
            Tree.expandAll("#cameltree");
        };
        $scope.contractAll = function () {
            Tree.contractAll("#cameltree");
        };
    }]);
    Camel._module.controller("Camel.TreeController", ["$scope", "$location", "$timeout", "workspace", "$rootScope", function ($scope, $location, $timeout, workspace, $rootScope) {
        $scope.contextFilterText = $location.search()["cq"];
        $scope.fullScreenViewLink = Camel.linkToFullScreenView(workspace);
        $scope.$on("$routeChangeSuccess", function (event, current, previous) {
            // lets do this asynchronously to avoid Error: $digest already in progress
            setTimeout(updateSelectionFromURL, 50);
        });
        var reloadThrottled = Core.throttled(reloadFunction, 500);
        $scope.$watch('workspace.tree', function () {
            reloadThrottled();
        });
        var reloadOnContextFilterThrottled = Core.throttled(function () {
            reloadFunction(function () {
                $("#camelContextIdFilter").focus();
            });
        }, 500);
        $scope.$watch('contextFilterText', function () {
            if ($scope.contextFilterText != $scope.lastContextFilterText) {
                $timeout(reloadOnContextFilterThrottled, 250);
            }
        });
        $rootScope.$on('camel-contextFilterText', function (event, value) {
            $scope.contextFilterText = value;
        });
        $scope.$on('jmxTreeUpdated', function () {
            reloadThrottled();
        });
        function reloadFunction(afterSelectionFn) {
            if (afterSelectionFn === void 0) { afterSelectionFn = null; }
            $scope.fullScreenViewLink = Camel.linkToFullScreenView(workspace);
            var children = [];
            var domainName = Camel.jmxDomain;
            // lets pull out each context
            var tree = workspace.tree;
            if (tree) {
                var rootFolder = new Folder("Camel Contexts");
                rootFolder.addClass = "org-apache-camel-context-folder";
                rootFolder.children = children;
                rootFolder.typeName = "context";
                rootFolder.key = "camelContexts";
                rootFolder.domain = domainName;
                var contextFilterText = $scope.contextFilterText;
                $scope.lastContextFilterText = contextFilterText;
                Camel.log.debug("Reloading the tree for filter: " + contextFilterText);
                var folder = tree.get(domainName);
                if (folder) {
                    angular.forEach(folder.children, function (value, key) {
                        var entries = value.map;
                        if (entries) {
                            var contextsFolder = entries["context"];
                            var routesNode = entries["routes"];
                            var endpointsNode = entries["endpoints"];
                            if (contextsFolder) {
                                var contextNode = contextsFolder.children[0];
                                if (contextNode) {
                                    var title = contextNode.title;
                                    var match = Core.matchFilterIgnoreCase(title, contextFilterText);
                                    if (match) {
                                        var folder = new Folder(title);
                                        folder.addClass = "org-apache-camel-context";
                                        folder.domain = domainName;
                                        folder.objectName = contextNode.objectName;
                                        folder.entries = contextNode.entries;
                                        folder.typeName = contextNode.typeName;
                                        folder.key = contextNode.key;
                                        folder.version = contextNode.version;
                                        if (routesNode) {
                                            var routesFolder = new Folder("Routes");
                                            routesFolder.addClass = "org-apache-camel-routes-folder";
                                            routesFolder.parent = contextsFolder;
                                            routesFolder.children = routesNode.children;
                                            angular.forEach(routesFolder.children, function (n) { return n.addClass = "org-apache-camel-routes"; });
                                            folder.children.push(routesFolder);
                                            routesFolder.typeName = "routes";
                                            routesFolder.key = routesNode.key;
                                            routesFolder.domain = routesNode.domain;
                                        }
                                        if (endpointsNode) {
                                            var endpointsFolder = new Folder("Endpoints");
                                            endpointsFolder.addClass = "org-apache-camel-endpoints-folder";
                                            endpointsFolder.parent = contextsFolder;
                                            endpointsFolder.children = endpointsNode.children;
                                            angular.forEach(endpointsFolder.children, function (n) {
                                                n.addClass = "org-apache-camel-endpoints";
                                                if (!Camel.getContextId(n)) {
                                                    n.entries["context"] = contextNode.entries["context"];
                                                }
                                            });
                                            folder.children.push(endpointsFolder);
                                            endpointsFolder.entries = contextNode.entries;
                                            endpointsFolder.typeName = "endpoints";
                                            endpointsFolder.key = endpointsNode.key;
                                            endpointsFolder.domain = endpointsNode.domain;
                                        }
                                        var jmxNode = new Folder("MBeans");
                                        // lets add all the entries which are not one context/routes/endpoints
                                        angular.forEach(entries, function (jmxChild, name) {
                                            if (name !== "context" && name !== "routes" && name !== "endpoints") {
                                                jmxNode.children.push(jmxChild);
                                            }
                                        });
                                        if (jmxNode.children.length > 0) {
                                            jmxNode.sortChildren(false);
                                            folder.children.push(jmxNode);
                                        }
                                        folder.parent = rootFolder;
                                        children.push(folder);
                                    }
                                }
                            }
                        }
                    });
                }
                var treeElement = $("#cameltree");
                Jmx.enableTree($scope, $location, workspace, treeElement, [rootFolder], true);
                // lets do this asynchronously to avoid Error: $digest already in progress
                setTimeout(function () {
                    updateSelectionFromURL();
                    if (angular.isFunction(afterSelectionFn)) {
                        afterSelectionFn();
                    }
                }, 50);
            }
        }
        function updateSelectionFromURL() {
            Jmx.updateTreeSelectionFromURLAndAutoSelect($location, $("#cameltree"), function (first) {
                // use function to auto select first Camel context routes if there is only one Camel context
                var contexts = first.getChildren();
                if (contexts && contexts.length === 1) {
                    first = contexts[0];
                    first.expand(true);
                    var children = first.getChildren();
                    if (children && children.length) {
                        var routes = children[0];
                        if (routes.data.typeName === 'routes') {
                            first = routes;
                            return first;
                        }
                    }
                }
                return null;
            }, true);
            $scope.fullScreenViewLink = Camel.linkToFullScreenView(workspace);
        }
    }]);
})(Camel || (Camel = {}));

/// <reference path="../../includes.ts"/>
/// <reference path="camelPlugin.ts"/>
var Camel;
(function (Camel) {
    Camel._module.controller("Camel.TypeConverterController", ["$scope", "$location", "workspace", "jolokia", function ($scope, $location, workspace, jolokia) {
        $scope.data = [];
        $scope.selectedMBean = null;
        $scope.mbeanAttributes = {};
        var columnDefs = [
            {
                field: 'from',
                displayName: 'From',
                cellFilter: null,
                width: "*",
                resizable: true
            },
            {
                field: 'to',
                displayName: 'To',
                cellFilter: null,
                width: "*",
                resizable: true
            }
        ];
        $scope.gridOptions = {
            data: 'data',
            displayFooter: true,
            displaySelectionCheckbox: false,
            canSelectRows: false,
            enableSorting: true,
            columnDefs: columnDefs,
            selectedItems: [],
            filterOptions: {
                filterText: ''
            }
        };
        function onAttributes(response) {
            var obj = response.value;
            if (obj) {
                $scope.mbeanAttributes = obj;
                // ensure web page is updated
                Core.$apply($scope);
            }
        }
        function onConverters(response) {
            var obj = response.value;
            if (obj) {
                // the JMX tabular data has 2 indexes so we need to dive 2 levels down to grab the data
                var arr = [];
                for (var key in obj) {
                    var values = obj[key];
                    for (var v in values) {
                        arr.push({ from: key, to: v });
                    }
                }
                arr = arr.sortBy("from");
                $scope.data = arr;
                // okay we have the data then set the selected mbean which allows UI to display data
                $scope.selectedMBean = response.request.mbean;
                // ensure web page is updated
                Core.$apply($scope);
            }
        }
        $scope.renderIcon = function (state) {
            return Camel.iconClass(state);
        };
        $scope.disableStatistics = function () {
            if ($scope.selectedMBean) {
                jolokia.setAttribute($scope.selectedMBean, "StatisticsEnabled", false);
            }
        };
        $scope.enableStatistics = function () {
            if ($scope.selectedMBean) {
                jolokia.setAttribute($scope.selectedMBean, "StatisticsEnabled", true);
            }
        };
        $scope.resetStatistics = function () {
            if ($scope.selectedMBean) {
                jolokia.request({ type: 'exec', mbean: $scope.selectedMBean, operation: 'resetTypeConversionCounters' }, Core.onSuccess(null, { silent: true }));
            }
        };
        function loadConverters() {
            console.log("Loading TypeConverter data...");
            var mbean = Camel.getSelectionCamelTypeConverter(workspace);
            if (mbean) {
                // grab attributes in real time
                var query = { type: "read", mbean: mbean, attribute: ["AttemptCounter", "FailedCounter", "HitCounter", "MissCounter", "NumberOfTypeConverters", "StatisticsEnabled"] };
                jolokia.request(query, Core.onSuccess(onAttributes));
                scopeStoreJolokiaHandle($scope, jolokia, jolokia.register(onAttributes, query));
                // and list of converters
                jolokia.request({ type: 'exec', mbean: mbean, operation: 'listTypeConverters' }, Core.onSuccess(onConverters));
            }
        }
        // load converters
        loadConverters();
    }]);
})(Camel || (Camel = {}));

/// <reference path="../../includes.ts"/>
/**
 * @module Osgi
 */
var Osgi;
(function (Osgi) {
    Osgi.log = Logger.get("OSGi");
    function defaultBundleValues(workspace, $scope, values) {
        var allValues = values;
        angular.forEach(values, function (row) {
            row["ImportData"] = parseActualPackages(row["ImportedPackages"]);
            row["ExportData"] = parseActualPackages(row["ExportedPackages"]);
            row["IdentifierLink"] = bundleLinks(workspace, row["Identifier"]);
            row["Hosts"] = labelBundleLinks(workspace, row["Hosts"], allValues);
            row["Fragments"] = labelBundleLinks(workspace, row["Fragments"], allValues);
            row["ImportedPackages"] = row["ImportedPackages"].union([]);
            row["StateStyle"] = getStateStyle("label", row["State"]);
            row["RequiringBundles"] = labelBundleLinks(workspace, row["RequiringBundles"], allValues);
        });
        return values;
    }
    Osgi.defaultBundleValues = defaultBundleValues;
    function getStateStyle(prefix, state) {
        switch (state) {
            case "INSTALLED":
                return prefix + "-important";
            case "RESOLVED":
                return prefix + "-inverse";
            case "STARTING":
                return prefix + "-warning";
            case "ACTIVE":
                return prefix + "-success";
            case "STOPPING":
                return prefix + "-info";
            case "UNINSTALLED":
                return "";
            default:
                return prefix + "-important";
        }
    }
    Osgi.getStateStyle = getStateStyle;
    function defaultServiceValues(workspace, $scope, values) {
        angular.forEach(values, function (row) {
            row["BundleIdentifier"] = bundleLinks(workspace, row["BundleIdentifier"]);
        });
        return values;
    }
    Osgi.defaultServiceValues = defaultServiceValues;
    function defaultPackageValues(workspace, $scope, values) {
        var packages = [];
        function onPackageEntry(packageEntry, row) {
            if (!row)
                row = packageEntry;
            var name = packageEntry["Name"];
            var version = packageEntry["Version"];
            if (name && !name.startsWith("#")) {
                packageEntry["VersionLink"] = "<a href='" + Core.url("#/osgi/package/" + name + "/" + version + workspace.hash()) + "'>" + version + "</a>";
                var importingBundles = row["ImportingBundles"] || packageEntry["ImportingBundles"];
                var exportingBundles = row["ExportingBundles"] || packageEntry["ExportingBundles"];
                packageEntry["ImportingBundleLinks"] = bundleLinks(workspace, importingBundles);
                packageEntry["ImportingBundleLinks"] = bundleLinks(workspace, importingBundles);
                packageEntry["ExportingBundleLinks"] = bundleLinks(workspace, exportingBundles);
                packages.push(packageEntry);
            }
        }
        // the values could contain a child 'values' array of objects so use those directly
        var childValues = values.values;
        if (childValues) {
            angular.forEach(childValues, onPackageEntry);
        }
        angular.forEach(values, function (row) {
            angular.forEach(row, function (version) {
                angular.forEach(version, function (packageEntry) {
                    onPackageEntry(packageEntry, row);
                });
            });
        });
        return packages;
    }
    Osgi.defaultPackageValues = defaultPackageValues;
    function defaultConfigurationValues(workspace, $scope, values) {
        var array = [];
        angular.forEach(values, function (row) {
            var map = {};
            map["Pid"] = row[0];
            map["PidLink"] = "<a href='" + Core.url("#/osgi/pid/" + row[0] + workspace.hash()) + "'>" + row[0] + "</a>";
            map["Bundle"] = row[1];
            array.push(map);
        });
        return array;
    }
    Osgi.defaultConfigurationValues = defaultConfigurationValues;
    function parseActualPackages(packages) {
        var result = {};
        for (var i = 0; i < packages.length; i++) {
            var pkg = packages[i];
            var idx = pkg.indexOf(";");
            if (idx > 0) {
                var name = pkg.substring(0, idx);
                var ver = pkg.substring(idx + 1);
                var data = result[name];
                if (data === undefined) {
                    data = {};
                    result[name] = data;
                }
                data["ReportedVersion"] = ver;
            }
        }
        return result;
    }
    Osgi.parseActualPackages = parseActualPackages;
    function parseManifestHeader(headers, name) {
        var result = {};
        var data = {};
        var hdr = headers[name];
        if (hdr === undefined) {
            return result;
        }
        var ephdr = hdr.Value;
        var inPkg = true;
        var inQuotes = false;
        var pkgName = "";
        var daDecl = "";
        for (var i = 0; i < ephdr.length; i++) {
            var c = ephdr[i];
            if (c === '"') {
                inQuotes = !inQuotes;
                continue;
            }
            if (inQuotes) {
                daDecl += c;
                continue;
            }
            // from here on we are never inside quotes
            if (c === ';') {
                if (inPkg) {
                    inPkg = false;
                }
                else {
                    handleDADecl(data, daDecl);
                    // reset directive and attribute variable
                    daDecl = "";
                }
                continue;
            }
            if (c === ',') {
                handleDADecl(data, daDecl);
                result[pkgName] = data;
                // reset data
                data = {};
                pkgName = "";
                daDecl = "";
                inPkg = true;
                continue;
            }
            if (inPkg) {
                pkgName += c;
            }
            else {
                daDecl += c;
            }
        }
        handleDADecl(data, daDecl);
        result[pkgName] = data;
        return result;
    }
    Osgi.parseManifestHeader = parseManifestHeader;
    function handleDADecl(data, daDecl) {
        var didx = daDecl.indexOf(":=");
        if (didx > 0) {
            data["D" + daDecl.substring(0, didx)] = daDecl.substring(didx + 2);
            return;
        }
        var aidx = daDecl.indexOf("=");
        if (aidx > 0) {
            data["A" + daDecl.substring(0, aidx)] = daDecl.substring(aidx + 1);
            return;
        }
    }
    function toCollection(values) {
        var collection = values;
        if (!angular.isArray(values)) {
            collection = [values];
        }
        return collection;
    }
    Osgi.toCollection = toCollection;
    function labelBundleLinks(workspace, values, allValues) {
        var answer = "";
        var sorted = toCollection(values).sort(function (a, b) {
            return a - b;
        });
        angular.forEach(sorted, function (value, key) {
            var prefix = "";
            if (answer.length > 0) {
                prefix = " ";
            }
            var info = allValues[value] || {};
            var labelText = info.SymbolicName;
            answer += prefix + "<a class='label' href='" + Core.url("#/osgi/bundle/" + value + workspace.hash()) + "'>" + labelText + "</a>";
        });
        return answer;
    }
    Osgi.labelBundleLinks = labelBundleLinks;
    function bundleLinks(workspace, values) {
        var answer = "";
        var sorted = toCollection(values).sort(function (a, b) {
            return a - b;
        });
        angular.forEach(sorted, function (value, key) {
            var prefix = "";
            if (answer.length > 0) {
                prefix = " ";
            }
            answer += prefix + "<a class='label' href='" + Core.url("#/osgi/bundle/" + value + workspace.hash()) + "'>" + value + "</a>";
        });
        return answer;
    }
    Osgi.bundleLinks = bundleLinks;
    function pidLinks(workspace, values) {
        var answer = "";
        angular.forEach(toCollection(values), function (value, key) {
            var prefix = "";
            if (answer.length > 0) {
                prefix = " ";
            }
            answer += prefix + "<a href='" + Core.url("#/osgi/bundle/" + value + workspace.hash()) + "'>" + value + "</a>";
        });
        return answer;
    }
    Osgi.pidLinks = pidLinks;
    /**
     * Finds a bundle by id
     *
     * @method findBundle
     * @for Osgi
     * @param {String} bundleId
     * @param {Array} values
     * @return {any}
     *
     */
    function findBundle(bundleId, values) {
        var answer = "";
        angular.forEach(values, function (row) {
            var id = row["Identifier"];
            if (bundleId === id.toString()) {
                answer = row;
                return answer;
            }
        });
        return answer;
    }
    Osgi.findBundle = findBundle;
    function getSelectionBundleMBean(workspace) {
        if (workspace) {
            // lets navigate to the tree item based on paths
            var folder = workspace.tree.navigate("osgi.core", "bundleState");
            return Osgi.findFirstObjectName(folder);
        }
        return null;
    }
    Osgi.getSelectionBundleMBean = getSelectionBundleMBean;
    /**
     * Walks the tree looking in the first child all the way down until we find an objectName
     * @method findFirstObjectName
     * @for Osgi
     * @param {Folder} node
     * @return {String}
     *
     */
    function findFirstObjectName(node) {
        if (node) {
            var answer = node.objectName;
            if (answer) {
                return answer;
            }
            else {
                var children = node.children;
                if (children && children.length) {
                    return findFirstObjectName(children[0]);
                }
            }
        }
        return null;
    }
    Osgi.findFirstObjectName = findFirstObjectName;
    function getSelectionFrameworkMBean(workspace) {
        if (workspace) {
            // lets navigate to the tree item based on paths
            var folder = workspace.tree.navigate("osgi.core", "framework");
            return Osgi.findFirstObjectName(folder);
        }
        return null;
    }
    Osgi.getSelectionFrameworkMBean = getSelectionFrameworkMBean;
    function getSelectionServiceMBean(workspace) {
        if (workspace) {
            // lets navigate to the tree item based on paths
            var folder = workspace.tree.navigate("osgi.core", "serviceState");
            return Osgi.findFirstObjectName(folder);
        }
        return null;
    }
    Osgi.getSelectionServiceMBean = getSelectionServiceMBean;
    function getSelectionPackageMBean(workspace) {
        if (workspace) {
            // lets navigate to the tree item based on paths
            var folder = workspace.tree.navigate("osgi.core", "packageState");
            return Osgi.findFirstObjectName(folder);
        }
        return null;
    }
    Osgi.getSelectionPackageMBean = getSelectionPackageMBean;
    function getSelectionConfigAdminMBean(workspace) {
        if (workspace) {
            // lets navigate to the tree item based on paths
            var folder = workspace.tree.navigate("osgi.compendium", "cm");
            return Osgi.findFirstObjectName(folder);
        }
        return null;
    }
    Osgi.getSelectionConfigAdminMBean = getSelectionConfigAdminMBean;
    function getMetaTypeMBean(workspace) {
        if (workspace) {
            var mbeanTypesToDomain = workspace.mbeanTypesToDomain;
            var typeFolder = mbeanTypesToDomain["MetaTypeFacade"] || {};
            var mbeanFolder = typeFolder["io.fabric8"] || {};
            return mbeanFolder["objectName"];
        }
        return null;
    }
    Osgi.getMetaTypeMBean = getMetaTypeMBean;
    function getProfileMetadataMBean(workspace) {
        if (workspace) {
            var mbeanTypesToDomain = workspace.mbeanTypesToDomain;
            var typeFolder = mbeanTypesToDomain["ProfileMetadata"] || {};
            var mbeanFolder = typeFolder["io.fabric8"] || {};
            return mbeanFolder["objectName"];
        }
        return null;
    }
    Osgi.getProfileMetadataMBean = getProfileMetadataMBean;
    function getHawtioOSGiToolsMBean(workspace) {
        if (workspace) {
            var mbeanTypesToDomain = workspace.mbeanTypesToDomain;
            var toolsFacades = mbeanTypesToDomain["OSGiTools"] || {};
            var hawtioFolder = toolsFacades["hawtio"] || {};
            return hawtioFolder["objectName"];
        }
        return null;
    }
    Osgi.getHawtioOSGiToolsMBean = getHawtioOSGiToolsMBean;
    function getHawtioConfigAdminMBean(workspace) {
        if (workspace) {
            var mbeanTypesToDomain = workspace.mbeanTypesToDomain;
            var typeFolder = mbeanTypesToDomain["ConfigAdmin"] || {};
            var mbeanFolder = typeFolder["hawtio"] || {};
            return mbeanFolder["objectName"];
        }
        return null;
    }
    Osgi.getHawtioConfigAdminMBean = getHawtioConfigAdminMBean;
    /**
     * Creates a link to the given configuration pid and/or factoryPid
     */
    function createConfigPidLink($scope, workspace, pid, isFactory) {
        if (isFactory === void 0) { isFactory = false; }
        return Core.url("#" + createConfigPidPath($scope, pid, isFactory) + workspace.hash());
    }
    Osgi.createConfigPidLink = createConfigPidLink;
    /**
     * Creates a path to the given configuration pid and/or factoryPid
     */
    function createConfigPidPath($scope, pid, isFactory) {
        if (isFactory === void 0) { isFactory = false; }
        var link = pid;
        var versionId = $scope.versionId;
        var profileId = $scope.profileId;
        if (versionId && versionId) {
            var configPage = isFactory ? "/newConfiguration/" : "/configuration/";
            return "/wiki/branch/" + versionId + configPage + link + "/" + $scope.pageId;
        }
        else {
            return "/osgi/pid/" + link;
        }
    }
    Osgi.createConfigPidPath = createConfigPidPath;
    /**
     * A helper method which initialises a scope's jolokia to refer to a profile's jolokia if used in a Fabric
     * or use a local jolokia
     */
    function initProfileScope($scope, $routeParams, $location, localStorage, jolokia, workspace, initFn) {
        if (initFn === void 0) { initFn = null; }
        Wiki.initScope($scope, $routeParams, $location);
        $scope.versionId = $routeParams.versionId || $scope.branch;
        $scope.profileId = $routeParams.profileId || Fabric.pagePathToProfileId($scope.pageId);
        if (!$scope.pageId) {
            $scope.pageId = Fabric.fabricTopLevel + Fabric.profilePath($scope.profileId);
        }
        if (!initFn) {
            initFn = function () { return null; };
        }
        var versionId = $scope.versionId;
        var profileId = $scope.profileId;
        $scope.profileNotRunning = false;
        $scope.profileMetadataMBean = null;
        if (versionId && profileId) {
            $scope.inFabricProfile = true;
            $scope.configurationsLink = "/wiki/branch/" + versionId + "/configurations/" + $scope.pageId;
            $scope.profileMetadataMBean = getProfileMetadataMBean(workspace);
            if ($scope.profileMetadataMBean) {
                $scope.profileNotRunning = true;
                $scope.jolokia = jolokia;
                $scope.workspace = workspace;
                initFn();
            }
            else {
                Fabric.profileJolokia(jolokia, profileId, versionId, function (profileJolokia) {
                    if (profileJolokia) {
                        $scope.jolokia = profileJolokia;
                        $scope.workspace = Core.createRemoteWorkspace(profileJolokia, $location, localStorage);
                    }
                    else {
                        // lets deal with the case we have no profile running right now so we have to have a plan B
                        // for fetching the profile configuration metadata
                        $scope.jolokia = jolokia;
                        $scope.workspace = workspace;
                        $scope.profileNotRunning = true;
                        $scope.profileMetadataMBean = getProfileMetadataMBean(workspace);
                    }
                    initFn();
                });
            }
        }
        else {
            $scope.configurationsLink = "/osgi/configurations";
            $scope.jolokia = jolokia;
            $scope.workspace = workspace;
            initFn();
        }
    }
    Osgi.initProfileScope = initProfileScope;
    function getConfigurationProperties(workspace, jolokia, pid, onDataFn) {
        var mbean = getSelectionConfigAdminMBean(workspace);
        var answer = null;
        if (jolokia && mbean) {
            answer = jolokia.execute(mbean, 'getProperties', pid, Core.onSuccess(onDataFn));
        }
        return answer;
    }
    Osgi.getConfigurationProperties = getConfigurationProperties;
    /**
     * For a pid of the form "foo.generatedId" for a pid "foo" or "foo.bar" remove the "foo." prefix
     */
    function removeFactoryPidPrefix(pid, factoryPid) {
        if (pid && factoryPid) {
            if (pid.startsWith(factoryPid)) {
                return pid.substring(factoryPid.length + 1);
            }
            var idx = factoryPid.lastIndexOf(".");
            if (idx > 0) {
                var prefix = factoryPid.substring(0, idx + 1);
                return Core.trimLeading(pid, prefix);
            }
        }
        return pid;
    }
    Osgi.removeFactoryPidPrefix = removeFactoryPidPrefix;
})(Osgi || (Osgi = {}));

/// <reference path="../../includes.ts"/>
/// <reference path="osgiHelpers.ts"/>
/**
 * @module Osgi
 */
var Osgi;
(function (Osgi) {
    Osgi._module.controller("Osgi.BundleListController", ["$scope", "workspace", "jolokia", "localStorage", function ($scope, workspace, jolokia, localStorage) {
        $scope.result = {};
        $scope.bundles = [];
        $scope.bundleUrl = "";
        $scope.display = {
            bundleField: "Name",
            sortField: "Identifier",
            bundleFilter: "",
            startLevelFilter: 0,
            showActiveMQBundles: false,
            showCamelBundles: false,
            showCxfBundles: false,
            showPlatformBundles: false
        };
        if ('bundleList' in localStorage) {
            $scope.display = angular.fromJson(localStorage['bundleList']);
        }
        $scope.$watch('display', function (newValue, oldValue) {
            if (newValue !== oldValue) {
                localStorage['bundleList'] = angular.toJson(newValue);
            }
        }, true);
        $scope.installDisabled = function () {
            return $scope.bundleUrl === "";
        };
        $scope.install = function () {
            jolokia.request({
                type: 'exec',
                mbean: Osgi.getSelectionFrameworkMBean(workspace),
                operation: "installBundle(java.lang.String)",
                arguments: [$scope.bundleUrl]
            }, {
                success: function (response) {
                    var bundleID = response.value;
                    jolokia.request({
                        type: 'exec',
                        mbean: Osgi.getSelectionBundleMBean(workspace),
                        operation: "isFragment(long)",
                        arguments: [bundleID]
                    }, {
                        success: function (response) {
                            var isFragment = response.value;
                            if (isFragment) {
                                Core.notification("success", "Fragment installed successfully.");
                                $scope.bundleUrl = "";
                                Core.$apply($scope);
                            }
                            else {
                                jolokia.request({
                                    type: 'exec',
                                    mbean: Osgi.getSelectionFrameworkMBean(workspace),
                                    operation: "startBundle(long)",
                                    arguments: [bundleID]
                                }, {
                                    success: function (response) {
                                        Core.notification("success", "Bundle installed and started successfully.");
                                        $scope.bundleUrl = "";
                                        Core.$apply($scope);
                                    },
                                    error: function (response) {
                                        Core.notification("error", response.error);
                                    }
                                });
                            }
                        },
                        error: function (response) {
                            Core.notification("error", response.error);
                        }
                    });
                },
                error: function (response) {
                    Core.notification("error", response.error);
                }
            });
        };
        $scope.$watch('display.sortField', function (newValue, oldValue) {
            if (newValue !== oldValue) {
                $scope.bundles = $scope.bundles.sortBy(newValue);
            }
        });
        $scope.getStateStyle = function (state) {
            return Osgi.getStateStyle("badge", state);
        };
        $scope.getLabel = function (bundleObject) {
            var labelText;
            if ($scope.display.bundleField === "Name") {
                labelText = bundleObject.Name;
                if (labelText === "") {
                    labelText = bundleObject.SymbolicName;
                }
            }
            else {
                labelText = bundleObject.SymbolicName;
            }
            return labelText;
        };
        $scope.filterBundle = function (bundle) {
            if ($scope.display.startLevelFilter > 0 && bundle.StartLevel < $scope.display.startLevelFilter) {
                return false;
            }
            var labelText = $scope.getLabel(bundle);
            if ($scope.display.bundleFilter && !labelText.toLowerCase().has($scope.display.bundleFilter.toLowerCase())) {
                return false;
            }
            if (Core.isBlank($scope.display.bundleFilter)) {
                var answer = true;
                if (!$scope.display.showPlatformBundles) {
                    answer = !Karaf.isPlatformBundle(bundle['SymbolicName']);
                }
                if (answer && !$scope.display.showActiveMQBundles) {
                    answer = !Karaf.isActiveMQBundle(bundle['SymbolicName']);
                }
                if (answer && !$scope.display.showCxfBundles) {
                    answer = !Karaf.isCxfBundle(bundle['SymbolicName']);
                }
                if (answer && !$scope.display.showCamelBundles) {
                    answer = !Karaf.isCamelBundle(bundle['SymbolicName']);
                }
                return answer;
            }
            return true;
        };
        function processResponse(response) {
            var value = response['value'];
            var responseJson = angular.toJson(value);
            if ($scope.responseJson !== responseJson) {
                $scope.responseJson = responseJson;
                $scope.bundles = [];
                angular.forEach(value, function (value, key) {
                    var obj = {
                        Identifier: value.Identifier,
                        Name: "",
                        SymbolicName: value.SymbolicName,
                        Fragment: value.Fragment,
                        State: value.State,
                        Version: value.Version,
                        LastModified: new Date(Number(value.LastModified)),
                        Location: value.Location,
                        StartLevel: undefined
                    };
                    if (value.Headers['Bundle-Name']) {
                        obj.Name = value.Headers['Bundle-Name']['Value'];
                    }
                    $scope.bundles.push(obj);
                });
                $scope.bundles = $scope.bundles.sortBy($scope.display.sortField);
                Core.$apply($scope);
                // Obtain start level information for all the bundles, let's do this async though
                setTimeout(function () {
                    var requests = [];
                    for (var i = 0; i < $scope.bundles.length; i++) {
                        var b = $scope.bundles[i];
                        requests.push({
                            type: 'exec',
                            mbean: Osgi.getSelectionBundleMBean(workspace),
                            operation: 'getStartLevel(long)',
                            arguments: [b.Identifier]
                        });
                    }
                    var outstanding = requests.length;
                    jolokia.request(requests, Core.onSuccess(function (response) {
                        var id = response['request']['arguments'].first();
                        if (angular.isDefined(id)) {
                            var bundle = $scope.bundles[id];
                            if (bundle) {
                                Osgi.log.debug("Setting bundle: ", bundle['Identifier'], " start level to: ", response['value']);
                                bundle['StartLevel'] = response['value'];
                            }
                        }
                        outstanding = outstanding - 1;
                        Osgi.log.debug("oustanding responses: ", outstanding);
                        if (outstanding === 0) {
                            Osgi.log.debug("Updating page...");
                            Core.$apply($scope);
                        }
                    }));
                }, 500);
            }
        }
        Core.register(jolokia, $scope, {
            type: 'exec',
            mbean: Osgi.getSelectionBundleMBean(workspace),
            operation: 'listBundles()'
        }, Core.onSuccess(processResponse));
    }]);
})(Osgi || (Osgi = {}));

/// <reference path="../../includes.ts"/>
/// <reference path="osgiHelpers.ts"/>
/**
 * @module Osgi
 */
var Osgi;
(function (Osgi) {
    // These functions are exported independently to facilitate unit testing
    function readBSNHeaderData(header) {
        var idx = header.indexOf(";");
        if (idx <= 0) {
            return "";
        }
        return header.substring(idx + 1).trim();
    }
    Osgi.readBSNHeaderData = readBSNHeaderData;
    function formatAttributesAndDirectivesForPopover(data, skipVersion) {
        var str = "";
        if (!data) {
            return str;
        }
        var sortedKeys = Object.keys(data).sort();
        for (var i = 0; i < sortedKeys.length; i++) {
            var da = sortedKeys[i];
            var type = da.charAt(0);
            var separator = "";
            var txtClass;
            if (type === "A") {
                separator = "=";
                txtClass = "text-info";
            }
            if (type === "D") {
                separator = ":=";
                txtClass = "muted";
            }
            if (separator !== "") {
                if (skipVersion) {
                    if (da === "Aversion") {
                        continue;
                    }
                }
                var value = data[da];
                if (value.length > 15) {
                    value = value.replace(/[,]/g, ",<br/>&nbsp;&nbsp;");
                }
                str += "<tr><td><strong class='" + txtClass + "'>" + da.substring(1) + "</strong>" + separator + value + "</td></tr>";
            }
        }
        return str;
    }
    Osgi.formatAttributesAndDirectivesForPopover = formatAttributesAndDirectivesForPopover;
    function formatServiceName(objClass) {
        if (Object.isArray(objClass)) {
            return formatServiceNameArray(objClass);
        }
        var name = objClass.toString();
        var idx = name.lastIndexOf('.');
        return name.substring(idx + 1);
    }
    Osgi.formatServiceName = formatServiceName;
    function formatServiceNameArray(objClass) {
        var rv = [];
        for (var i = 0; i < objClass.length; i++) {
            rv.add(formatServiceName(objClass[i]));
        }
        rv = rv.filter(function (elem, pos, self) {
            return self.indexOf(elem) === pos;
        });
        rv.sort();
        return rv.toString();
    }
    Osgi._module.controller("Osgi.BundleController", ["$scope", "$location", "workspace", "$routeParams", "jolokia", function ($scope, $location, workspace, $routeParams, jolokia) {
        $scope.bundleId = $routeParams.bundleId;
        updateTableContents();
        $scope.showValue = function (key) {
            switch (key) {
                case "Bundle-Name":
                case "Bundle-SymbolicName":
                case "Bundle-Version":
                case "Export-Package":
                case "Import-Package":
                    return false;
                default:
                    return true;
            }
        };
        $scope.executeLoadClass = function (clazz) {
            var mbean = Osgi.getHawtioOSGiToolsMBean(workspace);
            if (mbean) {
                jolokia.request({ type: 'exec', mbean: mbean, operation: 'getLoadClassOrigin', arguments: [$scope.bundleId, clazz] }, {
                    success: function (response) {
                        var divEl = document.getElementById("loadClassResult");
                        var resultBundle = response.value;
                        var style;
                        var resultTxt;
                        if (resultBundle === -1) {
                            style = "";
                            resultTxt = "Class can not be loaded from this bundle.";
                        }
                        else {
                            style = "alert-success";
                            resultTxt = "Class is served from Bundle " + Osgi.bundleLinks(workspace, resultBundle);
                        }
                        divEl.innerHTML += "<div class='alert " + style + "'>" + "<button type='button' class='close' data-dismiss='alert'>&times;</button>" + "Loading class <strong>" + clazz + "</strong> in Bundle " + $scope.bundleId + ". " + resultTxt + "</div>";
                    },
                    error: function (response) {
                        inspectReportError(response);
                    }
                });
            }
            else {
                inspectReportNoMBeanFound();
            }
        };
        $scope.executeFindResource = function (resource) {
            var mbean = Osgi.getHawtioOSGiToolsMBean(workspace);
            if (mbean) {
                jolokia.request({ type: 'exec', mbean: mbean, operation: 'getResourceURL', arguments: [$scope.bundleId, resource] }, {
                    success: function (response) {
                        var divEl = document.getElementById("loadClassResult");
                        var resultURL = response.value;
                        var style;
                        var resultTxt;
                        if (resultURL === null) {
                            style = "";
                            resultTxt = "Resource can not be found from this bundle.";
                        }
                        else {
                            style = "alert-success";
                            resultTxt = "Resource is available from: " + resultURL;
                        }
                        divEl.innerHTML += "<div class='alert " + style + "'>" + "<button type='button' class='close' data-dismiss='alert'>&times;</button>" + "Finding resource <strong>" + resource + "</strong> in Bundle " + $scope.bundleId + ". " + resultTxt + "</div>";
                    },
                    error: function (response) {
                        inspectReportError(response);
                    }
                });
            }
            else {
                inspectReportNoMBeanFound();
            }
        };
        $scope.mavenLink = function (row) {
            if (angular.isObject(row)) {
                return Maven.mavenLink(row.Location);
            }
            // TODO try using the LogQuery mbean to find the mvn coords for a bundle id?
            return "";
        };
        $scope.startBundle = function (bundleId) {
            jolokia.request([
                { type: 'exec', mbean: Osgi.getSelectionFrameworkMBean(workspace), operation: 'startBundle', arguments: [bundleId] }
            ], Core.onSuccess(updateTableContents));
        };
        $scope.stopBundle = function (bundleId) {
            jolokia.request([
                { type: 'exec', mbean: Osgi.getSelectionFrameworkMBean(workspace), operation: 'stopBundle', arguments: [bundleId] }
            ], Core.onSuccess(updateTableContents));
        };
        $scope.updatehBundle = function (bundleId) {
            jolokia.request([
                { type: 'exec', mbean: Osgi.getSelectionFrameworkMBean(workspace), operation: 'updateBundle', arguments: [bundleId] }
            ], Core.onSuccess(updateTableContents));
        };
        $scope.refreshBundle = function (bundleId) {
            jolokia.request([
                { type: 'exec', mbean: Osgi.getSelectionFrameworkMBean(workspace), operation: 'refreshBundle', arguments: [bundleId] }
            ], Core.onSuccess(updateTableContents));
        };
        $scope.uninstallBundle = function (bundleId) {
            jolokia.request([{
                type: 'exec',
                mbean: Osgi.getSelectionFrameworkMBean(workspace),
                operation: 'uninstallBundle',
                arguments: [bundleId]
            }], Core.onSuccess(function () {
                $location.path("/osgi/bundle-list");
                Core.$apply($scope);
            }));
        };
        function inspectReportNoMBeanFound() {
            var divEl = document.getElementById("loadClassResult");
            divEl.innerHTML += "<div class='alert alert-error'>" + "<button type='button' class='close' data-dismiss='alert'>&times;</button>" + "The hawtio.OSGiTools MBean is not available. Please contact technical support." + "</div>";
        }
        function inspectReportError(response) {
            var divEl = document.getElementById("loadClassResult");
            divEl.innerHTML += "<div class='alert alert-error'>" + "<button type='button' class='close' data-dismiss='alert'>&times;</button>" + "Problem invoking hawtio.OSGiTools MBean. " + response + "</div>";
        }
        function populateTable(response) {
            var values = response.value;
            $scope.bundles = values;
            // now find the row based on the selection ui
            Osgi.defaultBundleValues(workspace, $scope, values);
            $scope.row = Osgi.findBundle($scope.bundleId, values);
            Core.$apply($scope);
            // This trick is to ensure that the popover is properly visible if it is
            // smaller than the accordion
            $('.accordion-body.collapse').hover(function () {
                $(this).css('overflow', 'visible');
            }, function () {
                $(this).css('overflow', 'hidden');
            });
            // setup tooltips
            $("#bsn").tooltip({ title: readBSNHeaderData($scope.row.Headers["Bundle-SymbolicName"].Value), placement: "right" });
            createImportPackageSection();
            createExportPackageSection();
            populateServicesSection();
        }
        function createImportPackageSection() {
            // setup popovers
            var importPackageHeaders = Osgi.parseManifestHeader($scope.row.Headers, "Import-Package");
            for (var pkg in $scope.row.ImportData) {
                var data = importPackageHeaders[pkg];
                var po = "<small><table>" + "<tr><td><strong>Imported Version=</strong>" + $scope.row.ImportData[pkg].ReportedVersion + "</td></tr>";
                if (data !== undefined) {
                    // This happens in case the package was imported due to a DynamicImport-Package
                    po += formatAttributesAndDirectivesForPopover(data, false);
                    if (importPackageHeaders[pkg]["Dresolution"] !== "optional") {
                        $(document.getElementById("import." + pkg)).addClass("badge-info");
                    }
                }
                else {
                    // This is a dynamic import
                    $(document.getElementById("import." + pkg)).addClass("badge-important");
                    var reason = $scope.row.Headers["DynamicImport-Package"];
                    if (reason !== undefined) {
                        reason = reason.Value;
                        po += "<tr><td>Dynamic Import. Imported due to:</td></tr>";
                        po += "<tr><td><strong>DynamicImport-Package=</strong>" + reason + "</td></tr>";
                    }
                }
                po += "</table></small>";
                $(document.getElementById("import." + pkg)).popover({ title: "attributes and directives", content: po, trigger: "hover", html: true });
                // Unset the value so that we can see whether there are any unbound optional imports left...
                importPackageHeaders[pkg] = undefined;
            }
            var unsatisfied = "";
            for (var pkg in importPackageHeaders) {
                if (importPackageHeaders[pkg] === undefined) {
                    continue;
                }
                if ($scope.row.ExportData[pkg] !== undefined) {
                    continue;
                }
                unsatisfied += "<tr><td><div class='less-big badge badge-warning' id='unsatisfied." + pkg + "'>" + pkg + "</div></td></tr>";
            }
            if (unsatisfied !== "") {
                unsatisfied = "<p/><p class='text-warning'>The following optional imports were not satisfied:<table>" + unsatisfied + "</table></p>";
                document.getElementById("unsatisfiedOptionalImports").innerHTML = unsatisfied;
            }
            for (var pkg in importPackageHeaders) {
                if (importPackageHeaders[pkg] === undefined) {
                    continue;
                }
                var po = "<small><table>";
                po += formatAttributesAndDirectivesForPopover(importPackageHeaders[pkg], false);
                po += "</table></small>";
                $(document.getElementById("unsatisfied." + pkg)).popover({ title: "attributes and directives", content: po, trigger: "hover", html: true });
            }
        }
        function createExportPackageSection() {
            // setup popovers
            var exportPackageHeaders = Osgi.parseManifestHeader($scope.row.Headers, "Export-Package");
            for (var pkg in $scope.row.ExportData) {
                var po = "<small><table>" + "<tr><td><strong>Exported Version=</strong>" + $scope.row.ExportData[pkg].ReportedVersion + "</td></tr>";
                po += formatAttributesAndDirectivesForPopover(exportPackageHeaders[pkg], true);
                po += "</table></small>";
                $(document.getElementById("export." + pkg)).popover({ title: "attributes and directives", content: po, trigger: "hover", html: true });
            }
        }
        function populateServicesSection() {
            if (($scope.row.RegisteredServices === undefined || $scope.row.RegisteredServices.length === 0) && ($scope.row.ServicesInUse === undefined || $scope.row.ServicesInUse === 0)) {
                // no services for this bundle
                return;
            }
            var mbean = Osgi.getSelectionServiceMBean(workspace);
            if (mbean) {
                jolokia.request({ type: 'exec', mbean: mbean, operation: 'listServices()' }, Core.onSuccess(updateServices));
            }
        }
        function updateServices(result) {
            var data = result.value;
            for (var id in data) {
                var reg = document.getElementById("registers.service." + id);
                var uses = document.getElementById("uses.service." + id);
                if ((reg === undefined || reg === null) && (uses === undefined || uses === null)) {
                    continue;
                }
                jolokia.request({
                    type: 'exec',
                    mbean: Osgi.getSelectionServiceMBean(workspace),
                    operation: 'getProperties',
                    arguments: [id]
                }, Core.onSuccess(function (svcId, regEl, usesEl) {
                    return function (resp) {
                        var props = resp.value;
                        var sortedKeys = Object.keys(props).sort();
                        var po = "<small><table>";
                        for (var i = 0; i < sortedKeys.length; i++) {
                            var value = props[sortedKeys[i]];
                            if (value !== undefined) {
                                var fval = value.Value;
                                if (fval.length > 15) {
                                    fval = fval.replace(/[,]/g, ",<br/>&nbsp;&nbsp;");
                                }
                                po += "<tr><td valign='top'>" + sortedKeys[i] + "</td><td>" + fval + "</td></tr>";
                            }
                        }
                        var regBID = data[svcId].BundleIdentifier;
                        po += "<tr><td>Registered&nbsp;by</td><td>Bundle " + regBID + " <div class='less-big label'>" + $scope.bundles[regBID].SymbolicName + "</div></td></tr>";
                        po += "</table></small>";
                        if (regEl !== undefined && regEl !== null) {
                            regEl.innerText = " " + formatServiceName(data[svcId].objectClass);
                            $(regEl).popover({ title: "service properties", content: po, trigger: "hover", html: true });
                        }
                        if (usesEl !== undefined && usesEl !== null) {
                            usesEl.innerText = " " + formatServiceName(data[svcId].objectClass);
                            $(usesEl).popover({ title: "service properties", content: po, trigger: "hover", html: true });
                        }
                    };
                }(id, reg, uses)));
            }
        }
        function updateTableContents() {
            //console.log("Loading the bundles");
            var mbean = Osgi.getSelectionBundleMBean(workspace);
            if (mbean) {
                jolokia.request({ type: 'exec', mbean: mbean, operation: 'listBundles()' }, Core.onSuccess(populateTable));
            }
        }
    }]);
})(Osgi || (Osgi = {}));

/// <reference path="../../includes.ts"/>
/// <reference path="osgiHelpers.ts"/>
/**
 * @module Osgi
 */
var Osgi;
(function (Osgi) {
    Osgi._module.controller("Osgi.BundlesController", ["$scope", "workspace", "jolokia", function ($scope, workspace, jolokia) {
        $scope.result = {};
        $scope.bundles = [];
        $scope.selected = [];
        $scope.loading = true;
        $scope.bundleUrl = "";
        $scope.installDisabled = function () {
            return $scope.bundleUrl === "";
        };
        var columnDefs = [
            {
                field: 'Identifier',
                displayName: 'Identifier',
                width: "48",
                headerCellTemplate: '<div ng-click="col.sort()" class="ngHeaderSortColumn {{col.headerClass}}" ng-style="{\'cursor\': col.cursor}" ng-class="{ \'ngSorted\': !noSortVisible }"><div class="ngHeaderText colt{{$index}} pagination-centered" title="Identifier"><i class="icon-tag"></i></div><div class="ngSortButtonDown" ng-show="col.showSortButtonDown()"></div><div class="ngSortButtonUp" ng-show="col.showSortButtonUp()"></div></div>',
            },
            {
                field: 'State',
                displayName: 'Bundle State',
                width: "24",
                headerCellTemplate: '<div ng-click="col.sort()" class="ngHeaderSortColumn {{col.headerClass}}" ng-style="{\'cursor\': col.cursor}" ng-class="{ \'ngSorted\': !noSortVisible }"><div class="ngHeaderText colt{{$index}} pagination-centered" title="State"><i class="icon-tasks"></i></div><div class="ngSortButtonDown" ng-show="col.showSortButtonDown()"></div><div class="ngSortButtonUp" ng-show="col.showSortButtonUp()"></div></div>',
                cellTemplate: '<div class="ngCellText" title="{{row.getProperty(col.field)}}"><i class="{{row.getProperty(col.field)}}"></i></div>'
            },
            {
                field: 'Name',
                displayName: 'Name',
                width: "***",
                cellTemplate: '<div class="ngCellText"><a href="#/osgi/bundle/{{row.entity.Identifier}}?p=container">{{row.getProperty(col.field)}}</a></div>'
            },
            {
                field: 'SymbolicName',
                displayName: 'Symbolic Name',
                width: "***",
                cellTemplate: '<div class="ngCellText"><a href="#/osgi/bundle/{{row.entity.Identifier}}?p=container">{{row.getProperty(col.field)}}</a></div>'
            },
            {
                field: 'Version',
                displayName: 'Version',
                width: "**"
            },
            {
                field: 'Location',
                displayName: 'Update Location',
                width: "***"
            }
        ];
        $scope.gridOptions = {
            data: 'bundles',
            showFilter: false,
            selectedItems: $scope.selected,
            selectWithCheckboxOnly: true,
            columnDefs: columnDefs,
            filterOptions: {
                filterText: ''
            }
        };
        $scope.onResponse = function () {
            jolokia.request({
                type: 'exec',
                mbean: Osgi.getSelectionBundleMBean(workspace),
                operation: 'listBundles()'
            }, {
                success: render,
                error: render
            });
        };
        $scope.controlBundles = function (op) {
            var startBundle = function (response) {
            };
            var ids = $scope.selected.map(function (b) {
                return b.Identifier;
            });
            if (!angular.isArray(ids)) {
                ids = [ids];
            }
            jolokia.request({
                type: 'exec',
                mbean: Osgi.getSelectionFrameworkMBean(workspace),
                operation: op,
                arguments: [ids]
            }, {
                success: $scope.onResponse,
                error: $scope.onResponse
            });
        };
        $scope.stop = function () {
            $scope.controlBundles('stopBundles([J)');
        };
        $scope.start = function () {
            $scope.controlBundles('startBundles([J)');
        };
        $scope.update = function () {
            $scope.controlBundles('updateBundles([J)');
        };
        $scope.refresh = function () {
            $scope.controlBundles('refreshBundles([J)');
        };
        $scope.uninstall = function () {
            $scope.controlBundles('uninstallBundles([J)');
        };
        $scope.install = function () {
            jolokia.request({
                type: 'exec',
                mbean: Osgi.getSelectionFrameworkMBean(workspace),
                operation: "installBundle(java.lang.String)",
                arguments: [$scope.bundleUrl]
            }, {
                success: function (response) {
                    console.log("Got: ", response);
                    $scope.bundleUrl = "";
                    jolokia.request({
                        type: 'exec',
                        mbean: Osgi.getSelectionFrameworkMBean(workspace),
                        operation: "startBundle(long)",
                        arguments: [response.value]
                    }, {
                        success: $scope.onResponse,
                        error: $scope.onResponse
                    });
                },
                error: function (response) {
                    $scope.bundleUrl = "";
                    $scope.onResponse();
                }
            });
        };
        function render(response) {
            if (!Object.equal($scope.result, response.value)) {
                $scope.selected.length = 0;
                $scope.result = response.value;
                $scope.bundles = [];
                angular.forEach($scope.result, function (value, key) {
                    var obj = {
                        Identifier: value.Identifier,
                        Name: "",
                        SymbolicName: value.SymbolicName,
                        State: value.State,
                        Version: value.Version,
                        LastModified: value.LastModified,
                        Location: value.Location
                    };
                    if (value.Headers['Bundle-Name']) {
                        obj.Name = value.Headers['Bundle-Name']['Value'];
                    }
                    $scope.bundles.push(obj);
                });
                $scope.loading = false;
                Core.$apply($scope);
            }
        }
        Core.register(jolokia, $scope, {
            type: 'exec',
            mbean: Osgi.getSelectionBundleMBean(workspace),
            operation: 'listBundles()'
        }, Core.onSuccess(render));
    }]);
})(Osgi || (Osgi = {}));

/// <reference path="../../includes.ts"/>
/// <reference path="osgiHelpers.ts"/>
/**
 * @module Osgi
 */
var Osgi;
(function (Osgi) {
    Osgi._module.controller("Osgi.ConfigurationsController", ["$scope", "$routeParams", "$location", "workspace", "jolokia", function ($scope, $routeParams, $location, workspace, jolokia) {
        $scope.selectedItems = [];
        $scope.grid = {
            data: 'configurations',
            showFilter: false,
            showColumnMenu: false,
            multiSelect: false,
            filterOptions: {
                filterText: "",
                useExternalFilter: false
            },
            selectedItems: $scope.selectedItems,
            showSelectionCheckbox: false,
            displaySelectionCheckbox: false,
            columnDefs: [
                {
                    field: 'Pid',
                    displayName: 'Configuration',
                    cellTemplate: '<div class="ngCellText"><a ng-href="{{row.entity.pidLink}}" title="{{row.entity.description}}">{{row.entity.name}}</a></div>'
                }
            ]
        };
        /** the kinds of config */
        var configKinds = {
            factory: {
                class: "badge badge-info",
                title: "Configuration factory used to create separate instances of the configuration"
            },
            pid: {
                class: "badge badge-success",
                title: "Configuration which has a set of properties associated with it"
            },
            pidNoValue: {
                class: "badge badge-warning",
                title: "Configuration which does not yet have any bound values"
            }
        };
        $scope.addPidDialog = new UI.Dialog();
        Osgi.initProfileScope($scope, $routeParams, $location, localStorage, jolokia, workspace, function () {
            $scope.$watch('workspace.selection', function () {
                updateTableContents();
            });
            updateTableContents();
        });
        $scope.addPid = function (newPid) {
            $scope.addPidDialog.close();
            var mbean = Osgi.getHawtioConfigAdminMBean($scope.workspace);
            if (mbean && newPid) {
                var json = JSON.stringify({});
                $scope.jolokia.execute(mbean, "configAdminUpdate", newPid, json, Core.onSuccess(function (response) {
                    Core.notification("success", "Successfully created pid: " + newPid);
                    updateTableContents();
                }));
            }
        };
        $scope.$on("$routeChangeSuccess", function (event, current, previous) {
            // lets do this asynchronously to avoid Error: $digest already in progress
            setTimeout(updateTableContents, 50);
        });
        function onConfigPids(response) {
            var pids = {};
            angular.forEach(response, function (row) {
                var pid = row[0];
                var bundle = row[1];
                var config = createPidConfig(pid, bundle);
                if (!ignorePid(pid)) {
                    config["hasValue"] = true;
                    config["kind"] = configKinds.pid;
                    pids[pid] = config;
                }
            });
            $scope.pids = pids;
            // lets load the factory pids
            var mbean = Osgi.getSelectionConfigAdminMBean($scope.workspace);
            if (mbean) {
                $scope.jolokia.execute(mbean, 'getConfigurations', '(service.factoryPid=*)', Core.onSuccess(onConfigFactoryPids, errorHandler("Failed to load factory PID configurations: ")));
            }
            loadMetaType();
        }
        /**
         * For each factory PID lets find the underlying PID to use to edit it, then lets make a link between them
         */
        function onConfigFactoryPids(response) {
            var mbean = Osgi.getSelectionConfigAdminMBean($scope.workspace);
            var pids = $scope.pids;
            if (pids && mbean) {
                angular.forEach(response, function (row) {
                    var pid = row[0];
                    var bundle = row[1];
                    if (pid && !ignorePid(pid)) {
                        var config = pids[pid];
                        if (config) {
                            config["isFactoryInstance"] = true;
                            $scope.jolokia.execute(mbean, 'getFactoryPid', pid, Core.onSuccess(function (factoryPid) {
                                config["factoryPid"] = factoryPid;
                                config["name"] = Osgi.removeFactoryPidPrefix(pid, factoryPid);
                                if (factoryPid) {
                                    var factoryConfig = getOrCreatePidConfig(factoryPid, bundle, pids);
                                    if (factoryConfig) {
                                        configureFactoryPidConfig(pid, factoryConfig, config);
                                        if ($scope.inFabricProfile) {
                                            Osgi.getConfigurationProperties($scope.workspace, $scope.jolokia, pid, function (configValues) {
                                                var zkPid = Core.pathGet(configValues, ["fabric.zookeeper.pid", "Value"]);
                                                if (zkPid) {
                                                    config["name"] = Osgi.removeFactoryPidPrefix(zkPid, factoryPid);
                                                    config["zooKeeperPid"] = zkPid;
                                                    Core.$apply($scope);
                                                }
                                            });
                                        }
                                        Core.$apply($scope);
                                    }
                                }
                            }));
                        }
                    }
                });
            }
            updateMetaType();
        }
        function onMetaType(response) {
            $scope.metaType = response;
            updateMetaType();
        }
        function updateConfigurations() {
            var pids = $scope.pids;
            var configurations = [];
            angular.forEach(pids, function (config, pid) {
                if (!config["isFactoryInstance"]) {
                    configurations.push(config);
                }
            });
            $scope.configurations = configurations.sortBy("name");
            Core.$apply($scope);
        }
        function updateMetaType(lazilyCreateConfigs) {
            if (lazilyCreateConfigs === void 0) { lazilyCreateConfigs = true; }
            var metaType = $scope.metaType;
            if (metaType) {
                var pidMetadata = Osgi.configuration.pidMetadata;
                var pids = $scope.pids || {};
                angular.forEach(metaType.pids, function (value, pid) {
                    var bundle = null;
                    var config = lazilyCreateConfigs ? getOrCreatePidConfig(pid, bundle) : pids[pid];
                    if (config) {
                        var factoryPidBundleIds = value.factoryPidBundleIds;
                        if (factoryPidBundleIds && factoryPidBundleIds.length) {
                            setFactoryPid(config);
                        }
                        config["name"] = Core.pathGet(pidMetadata, [pid, "name"]) || trimUnnecessaryPrefixes(value.name) || pid;
                        var description = Core.pathGet(pidMetadata, [pid, "description"]) || value.description;
                        /*
                                    if (description) {
                                      description = description + "\n" + pidBundleDescription(pid, config.bundle);
                                    }
                        */
                        config["description"] = description;
                    }
                });
            }
            updateConfigurations();
        }
        function loadMetaType() {
            if ($scope.pids) {
                if ($scope.profileNotRunning && $scope.profileMetadataMBean && $scope.versionId && $scope.profileId) {
                    jolokia.execute($scope.profileMetadataMBean, "metaTypeSummary", $scope.versionId, $scope.profileId, Core.onSuccess(onMetaType));
                }
                else {
                    var metaTypeMBean = Osgi.getMetaTypeMBean($scope.workspace);
                    if (metaTypeMBean) {
                        $scope.jolokia.execute(metaTypeMBean, "metaTypeSummary", Core.onSuccess(onMetaType));
                    }
                }
            }
        }
        function updateTableContents() {
            $scope.configurations = [];
            if ($scope.profileNotRunning && $scope.profileMetadataMBean && $scope.versionId && $scope.profileId) {
                jolokia.execute($scope.profileMetadataMBean, "metaTypeSummary", $scope.versionId, $scope.profileId, Core.onSuccess(onProfileMetaType, { silent: true }));
            }
            else {
                if ($scope.jolokia) {
                    var mbean = Osgi.getSelectionConfigAdminMBean($scope.workspace);
                    if (mbean) {
                        $scope.jolokia.execute(mbean, 'getConfigurations', '(service.pid=*)', Core.onSuccess(onConfigPids, errorHandler("Failed to load PID configurations: ")));
                    }
                }
            }
        }
        function onProfileMetaType(response) {
            var metaType = response;
            if (metaType) {
                var pids = {};
                angular.forEach(metaType.pids, function (value, pid) {
                    if (value && !ignorePid(pid)) {
                        // TODO we don't have a bundle ID
                        var bundle = "mvn:" + pid;
                        var config = {
                            pid: pid,
                            name: value.name,
                            class: 'pid',
                            description: value.description,
                            bundle: bundle,
                            kind: configKinds.pid,
                            pidLink: createPidLink(pid)
                        };
                        pids[pid] = config;
                    }
                });
                angular.forEach(pids, function (config, pid) {
                    var idx = pid.indexOf('-');
                    if (idx > 0) {
                        var factoryPid = pid.substring(0, idx);
                        var name = pid.substring(idx + 1, pid.length);
                        var factoryConfig = pids[factoryPid];
                        if (!factoryConfig) {
                            var bundle = config.bundle;
                            factoryConfig = getOrCreatePidConfig(factoryPid, bundle, pids);
                        }
                        if (factoryConfig) {
                            configureFactoryPidConfig(pid, factoryConfig, config, factoryPid);
                            config.name = name;
                            pids[factoryPid] = factoryConfig;
                            // lets remove the pid instance as its now a child of the factory
                            delete pids[pid];
                        }
                    }
                });
                $scope.pids = pids;
            }
            // now lets process the response and replicate the getConfigurations / getProperties API
            // calls on the OSGi API
            // to get the tree of factory pids or pids
            $scope.metaType = metaType;
            updateMetaType(false);
        }
        function trimUnnecessaryPrefixes(name) {
            angular.forEach(["Fabric8 ", "Apache "], function (prefix) {
                if (name && name.startsWith(prefix) && name.length > prefix.length) {
                    name = name.substring(prefix.length);
                }
            });
            return name;
        }
        function pidBundleDescription(pid, bundle) {
            var pidMetadata = Osgi.configuration.pidMetadata;
            return Core.pathGet(pidMetadata, [pid, "description"]) || "pid: " + pid + "\nbundle: " + bundle;
        }
        function createPidConfig(pid, bundle) {
            var pidMetadata = Osgi.configuration.pidMetadata;
            var config = {
                pid: pid,
                name: Core.pathGet(pidMetadata, [pid, "name"]) || pid,
                class: 'pid',
                description: Core.pathGet(pidMetadata, [pid, "description"]) || pidBundleDescription(pid, bundle),
                bundle: bundle,
                kind: configKinds.pidNoValue,
                pidLink: createPidLink(pid)
            };
            return config;
        }
        function ignorePid(pid) {
            var answer = false;
            angular.forEach(Osgi.configuration.ignorePids, function (pattern) {
                if (pid.startsWith(pattern)) {
                    answer = true;
                }
            });
            return answer;
        }
        function getOrCreatePidConfig(pid, bundle, pids) {
            if (pids === void 0) { pids = null; }
            if (ignorePid(pid)) {
                Osgi.log.info("ignoring pid " + pid);
                return null;
            }
            else {
                if (!pids) {
                    pids = $scope.pids;
                }
                var factoryConfig = pids[pid];
                if (!factoryConfig) {
                    factoryConfig = createPidConfig(pid, bundle);
                    pids[pid] = factoryConfig;
                    updateConfigurations();
                }
                return factoryConfig;
            }
        }
        function configureFactoryPidConfig(pid, factoryConfig, config, factoryPid) {
            if (factoryPid === void 0) { factoryPid = null; }
            setFactoryPid(factoryConfig, factoryPid, pid);
            //config["pidLink"] = createPidLink(pid, factoryPid);
            var children = factoryConfig.children;
            if (factoryPid) {
                factoryConfig.pidLink = createPidLink(factoryPid, true);
            }
            if (!children) {
                children = {};
                factoryConfig["children"] = children;
            }
            children[pid] = config;
        }
        function setFactoryPid(factoryConfig, factoryPid, pid) {
            if (factoryPid === void 0) { factoryPid = null; }
            if (pid === void 0) { pid = null; }
            factoryConfig["isFactory"] = true;
            factoryConfig["class"] = "factoryPid";
            factoryConfig["kind"] = configKinds.factory;
            if (!factoryPid) {
                factoryPid = factoryConfig["factoryPid"] || "";
            }
            if (!pid) {
                pid = factoryConfig["pid"] || "";
            }
            if (!factoryPid) {
                factoryPid = pid;
                pid = null;
            }
            factoryConfig["pidLink"] = createPidLink(factoryPid);
        }
        function createPidLink(pid, isFactory) {
            if (isFactory === void 0) { isFactory = false; }
            return Osgi.createConfigPidLink($scope, workspace, pid, isFactory);
        }
        function errorHandler(message) {
            return {
                error: function (response) {
                    Core.notification("error", message + response['error'] || response);
                    Core.defaultJolokiaErrorHandler(response);
                }
            };
        }
    }]);
})(Osgi || (Osgi = {}));

/// <reference path="../../includes.ts"/>
/// <reference path="osgiHelpers.ts"/>
/**
 * @module Osgi
 */
var Osgi;
(function (Osgi) {
    Osgi._module.controller("Osgi.FrameworkController", ["$scope", "$dialog", "workspace", function ($scope, $dialog, workspace) {
        $scope.editDialog = new UI.Dialog();
        updateContents();
        $scope.edit = function (attr, displayName) {
            $scope.editAttr = attr;
            $scope.editDisplayName = displayName;
            $scope.editDialog.open();
        };
        $scope.edited = function (name, displayName, res) {
            $scope.editDialog.close();
            if (angular.isNumber(res)) {
                var mbean = Osgi.getSelectionFrameworkMBean(workspace);
                if (mbean) {
                    var jolokia = workspace.jolokia;
                    jolokia.request({
                        type: 'write',
                        mbean: mbean,
                        attribute: name,
                        value: res
                    }, {
                        error: function (response) {
                            editWritten("error", response.error);
                        },
                        success: function (response) {
                            editWritten("success", displayName + " changed to " + res);
                        }
                    });
                }
            }
        };
        function editWritten(status, message) {
            Core.notification(status, message);
            updateContents();
        }
        function populatePage(response) {
            $scope.startLevel = response.value.FrameworkStartLevel;
            $scope.initialBundleStartLevel = response.value.InitialBundleStartLevel;
            Core.$apply($scope);
        }
        function updateContents() {
            var mbean = Osgi.getSelectionFrameworkMBean(workspace);
            if (mbean) {
                var jolokia = workspace.jolokia;
                jolokia.request({ type: 'read', mbean: mbean }, Core.onSuccess(populatePage));
            }
        }
    }]);
})(Osgi || (Osgi = {}));

/// <reference path="../../includes.ts"/>
/// <reference path="osgiHelpers.ts"/>
/**
 * @module Osgi
 */
var Osgi;
(function (Osgi) {
    Osgi.configuration = {
        // extra metadata per config admin PID
        pidMetadata: {
            "io.fabric8.container.java": {
                name: "Java Container"
            },
            "io.fabric8.container.process": {
                name: "Process Container"
            },
            "io.fabric8.container.process.overlay.resources": {
                name: "Container Overlay Resources",
                description: "The resources overlaid over the distribution of the process",
                schemaExtensions: {
                    disableHumanizeLabel: true
                }
            },
            "io.fabric8.dosgi": {
                name: "Fabric8 DOSGi",
                description: "The configuration for the Distributed OSGi implementation in Fabric8"
            },
            "io.fabric8.environment": {
                name: "Environment Variables",
                description: "The operating system Environment Variables which are exported into any child processes",
                schemaExtensions: {
                    disableHumanizeLabel: true
                }
            },
            "io.fabric8.fab.osgi.url": {
                name: "FAB URL",
                description: "Configures the 'fab:' URL handler for deploying JARs as bundles"
            },
            "io.fabric8.mq.fabric.server": {
                name: "ActiveMQ Broker",
                description: "The configuration of the Apache ActiveMQ server configured via the fabric"
            },
            "io.fabric8.openshift": {
                name: "OpenShift"
            },
            "io.fabric8.ports": {
                name: "Ports",
                description: "The network ports exported by the container",
                schemaExtensions: {
                    disableHumanizeLabel: true
                }
            },
            "io.fabric8.system": {
                name: "System Properties",
                description: "The Java System Properties which are exported into any child Java processes",
                schemaExtensions: {
                    disableHumanizeLabel: true
                }
            },
            "io.fabric8.version": {
                name: "Versions",
                schemaExtensions: {
                    disableHumanizeLabel: true
                }
            },
            "org.ops4j.pax.logging": {
                name: "Logging",
                description: "The configuration of the logging subsystem"
            },
            "org.ops4j.pax.url.mvn": {
                name: "Maven URL",
                description: "Configures the Maven 'mvn:' URL handler for referencing maven artifacts"
            },
            "org.ops4j.pax.url.war": {
                name: "WAR URL",
                description: "Configures the 'war:' URL handler for referencing WAR deployments"
            },
            "org.ops4j.pax.url.wrap": {
                name: "Wrap URL",
                description: "Configures the 'wrap:' URL handler for wrapping JARs as bundles"
            }
        },
        // pids to ignore from the config UI
        ignorePids: [
            "jmx.acl",
            "io.fabric8.agent",
            "io.fabric8.git",
            "io.fabric8.mq.fabric.template",
            "io.fabric8.openshift.agent",
            "io.fabric8.service.ZkDataStoreImpl",
            "org.apache.felix.fileinstall",
            "org.apache.karaf.command.acl.",
            "org.apache.karaf.service.acl."
        ],
        // UI tabs
        tabs: {
            "fabric8": {
                label: "Fabric8",
                description: "Configuration options for the Fabric8 services",
                pids: ["io.fabric8"]
            },
            "karaf": {
                label: "Karaf",
                description: "Configuration options for the Apache Karaf container and subsystem",
                pids: ["org.apache.karaf"]
            }
        }
    };
})(Osgi || (Osgi = {}));

/// <reference path="../../includes.ts"/>
/// <reference path="osgiHelpers.ts"/>
/**
 * @module Osgi
 */
var Osgi;
(function (Osgi) {
    var OsgiDataService = (function () {
        function OsgiDataService(workspace, jolokia) {
            this.jolokia = jolokia;
            this.workspace = workspace;
        }
        OsgiDataService.prototype.getBundles = function () {
            var bundles = {};
            // TODO make this async,especially given this returns lots of data
            var response = this.jolokia.request({
                type: 'exec',
                mbean: Osgi.getSelectionBundleMBean(this.workspace),
                operation: 'listBundles()'
            }, Core.onSuccess(null));
            angular.forEach(response.value, function (value, key) {
                var obj = {
                    Identifier: value.Identifier,
                    Name: "",
                    SymbolicName: value.SymbolicName,
                    Fragment: value.Fragment,
                    State: value.State,
                    Version: value.Version,
                    LastModified: new Date(Number(value.LastModified)),
                    Location: value.Location,
                    StartLevel: undefined,
                    RegisteredServices: value.RegisteredServices,
                    ServicesInUse: value.ServicesInUse
                };
                if (value.Headers['Bundle-Name']) {
                    obj.Name = value.Headers['Bundle-Name']['Value'];
                }
                bundles[value.Identifier] = obj;
            });
            return bundles;
        };
        OsgiDataService.prototype.getServices = function () {
            var services = {};
            var response = this.jolokia.request({
                type: 'exec',
                mbean: Osgi.getSelectionServiceMBean(this.workspace),
                operation: 'listServices()'
            }, Core.onSuccess(null));
            var answer = response.value;
            angular.forEach(answer, function (value, key) {
                services[value.Identifier] = value;
            });
            return services;
        };
        OsgiDataService.prototype.getPackages = function () {
            var packages = {};
            var response = this.jolokia.request({
                type: 'exec',
                mbean: Osgi.getSelectionPackageMBean(this.workspace),
                operation: 'listPackages()'
            }, Core.onSuccess(null));
            var answer = response.value.values;
            answer.forEach(function (value) {
                packages[value.Name + "-" + value.Version] = value;
            });
            return packages;
        };
        return OsgiDataService;
    })();
    Osgi.OsgiDataService = OsgiDataService;
})(Osgi || (Osgi = {}));

/// <reference path="../../includes.ts"/>
/// <reference path="osgiHelpers.ts"/>
/**
 * @module Osgi
 */
var Osgi;
(function (Osgi) {
    var OsgiGraphBuilder = (function () {
        function OsgiGraphBuilder(osgiDataService, bundleFilter, packageFilter, showServices, showPackages, hideUnused) {
            this.filteredBundles = {};
            this.bundles = null;
            this.services = null;
            this.packages = null;
            this.PREFIX_BUNDLE = "Bundle-";
            this.PREFIX_SVC = "Service-";
            this.PREFIX_PKG = "Package-";
            this.osgiDataService = osgiDataService;
            this.bundleFilter = bundleFilter;
            this.packageFilter = packageFilter;
            this.showServices = showServices;
            this.showPackages = showPackages;
            this.hideUnused = hideUnused;
            this.graphBuilder = new ForceGraph.GraphBuilder();
        }
        OsgiGraphBuilder.prototype.getBundles = function () {
            if (this.bundles == null) {
                this.bundles = this.osgiDataService.getBundles();
            }
            return this.bundles;
        };
        OsgiGraphBuilder.prototype.getServices = function () {
            if (this.services == null) {
                this.services = this.osgiDataService.getServices();
            }
            return this.services;
        };
        OsgiGraphBuilder.prototype.getPackages = function () {
            if (this.packages == null) {
                this.packages = this.osgiDataService.getPackages();
            }
            return this.packages;
        };
        OsgiGraphBuilder.prototype.bundleNodeId = function (bundle) {
            return this.PREFIX_BUNDLE + bundle.Identifier;
        };
        OsgiGraphBuilder.prototype.serviceNodeId = function (service) {
            return this.PREFIX_SVC + service.Identifier;
        };
        OsgiGraphBuilder.prototype.pkgNodeId = function (pkg) {
            return this.PREFIX_PKG + pkg.Name + "-" + pkg.Version;
        };
        // Create a service node from a given service
        OsgiGraphBuilder.prototype.buildSvcNode = function (service) {
            return {
                id: this.serviceNodeId(service),
                name: "" + service.Identifier,
                type: "service",
                used: false,
                //                image: {
                //                    url: "/hawtio/img/icons/osgi/service.png",
                //                    width: 32,
                //                    height:32
                //                },
                popup: {
                    title: "Service [" + service.Identifier + "]",
                    content: (function () {
                        var result = "";
                        if (service != null) {
                            service.objectClass.forEach(function (clazz) {
                                if (result.length > 0) {
                                    result = result + "<br/>";
                                }
                                result = result + clazz;
                            });
                        }
                        return result;
                    })
                }
            };
        };
        // Create a bundle node for a given bundle
        OsgiGraphBuilder.prototype.buildBundleNode = function (bundle) {
            return {
                id: this.bundleNodeId(bundle),
                name: bundle.SymbolicName,
                type: "bundle",
                used: false,
                navUrl: "#/osgi/bundle/" + bundle.Identifier,
                //                image: {
                //                    url: "/hawtio/img/icons/osgi/bundle.png",
                //                    width: 32,
                //                    height:32
                //                },
                popup: {
                    title: "Bundle [" + bundle.Identifier + "]",
                    content: "<p>" + bundle.SymbolicName + "<br/>Version " + bundle.Version + "</p>"
                }
            };
        };
        OsgiGraphBuilder.prototype.buildPackageNode = function (pkg) {
            return {
                id: this.pkgNodeId(pkg),
                name: pkg.Name,
                type: "package",
                used: false,
                popup: {
                    title: "Package [" + pkg.Name + "]",
                    content: "<p>" + pkg.Version + "</p>"
                }
            };
        };
        OsgiGraphBuilder.prototype.exportingBundle = function (pkg) {
            var _this = this;
            var result = null;
            pkg.ExportingBundles.forEach(function (bundleId) {
                if (_this.filteredBundles[_this.PREFIX_BUNDLE + bundleId] != null) {
                    result = bundleId;
                }
            });
            return result;
        };
        OsgiGraphBuilder.prototype.addFilteredBundles = function () {
            var _this = this;
            d3.values(this.getBundles()).forEach(function (bundle) {
                if (_this.bundleFilter == null || _this.bundleFilter == "" || bundle.SymbolicName.startsWith(_this.bundleFilter)) {
                    var bundleNode = _this.buildBundleNode(bundle);
                    _this.filteredBundles[bundleNode.id] = bundle;
                    bundleNode.used = true;
                    _this.graphBuilder.addNode(bundleNode);
                    if (_this.showServices) {
                        var services = _this.getServices();
                        bundle.RegisteredServices.forEach(function (sid) {
                            var svc = services[sid];
                            if (svc) {
                                var svcNode = _this.buildSvcNode(services[sid]);
                                _this.graphBuilder.addNode(svcNode);
                                _this.graphBuilder.addLink(bundleNode.id, svcNode.id, "registered");
                            }
                        });
                    }
                }
            });
        };
        OsgiGraphBuilder.prototype.addFilteredServices = function () {
            var _this = this;
            if (this.showServices) {
                d3.values(this.getBundles()).forEach(function (bundle) {
                    bundle.ServicesInUse.forEach(function (sid) {
                        var svcNodeId = _this.PREFIX_SVC + sid;
                        if (_this.graphBuilder.getNode(svcNodeId) != null) {
                            _this.graphBuilder.getNode(svcNodeId).used = true;
                            var bundleNode = _this.graphBuilder.getNode(_this.bundleNodeId(bundle)) || _this.buildBundleNode(bundle);
                            bundleNode.used = true;
                            _this.graphBuilder.addNode(bundleNode);
                            _this.graphBuilder.addLink(svcNodeId, bundleNode.id, "inuse");
                        }
                    });
                });
            }
        };
        OsgiGraphBuilder.prototype.addFilteredPackages = function () {
            var _this = this;
            if (this.showPackages) {
                d3.values(this.getPackages()).forEach(function (pkg) {
                    if (_this.packageFilter == null || _this.packageFilter == "" || pkg.Name.startsWith(_this.packageFilter)) {
                        var exportingId = _this.exportingBundle(pkg);
                        if (exportingId != null) {
                            var bundleNode = _this.graphBuilder.getNode(_this.PREFIX_BUNDLE + exportingId);
                            bundleNode.used = true;
                            var pkgNode = _this.buildPackageNode(pkg);
                            _this.graphBuilder.addNode(pkgNode);
                            _this.graphBuilder.addLink(bundleNode.id, pkgNode.id, "registered");
                            pkg.ImportingBundles.forEach(function (bundleId) {
                                var bundleNode = _this.graphBuilder.getNode(_this.PREFIX_BUNDLE + bundleId) || _this.buildBundleNode(_this.getBundles()[bundleId]);
                                bundleNode.used = true;
                                pkgNode.used = true;
                                _this.graphBuilder.addNode(bundleNode);
                                _this.graphBuilder.addLink(bundleNode.id, pkgNode.id, "inuse");
                            });
                        }
                    }
                });
            }
        };
        OsgiGraphBuilder.prototype.buildGraph = function () {
            var _this = this;
            this.addFilteredBundles();
            this.addFilteredServices();
            this.addFilteredPackages();
            if (this.hideUnused) {
                // this will filter out all nodes that are not marked as used in our data model
                this.graphBuilder.filterNodes(function (node) {
                    return node.used;
                });
                // this will remove all nodes that do not have connections after filtering the unused nodes
                this.graphBuilder.filterNodes(function (node) {
                    return _this.graphBuilder.hasLinks(node.id);
                });
            }
            return this.graphBuilder.buildGraph();
        };
        return OsgiGraphBuilder;
    })();
    Osgi.OsgiGraphBuilder = OsgiGraphBuilder;
})(Osgi || (Osgi = {}));

/// <reference path="../../includes.ts"/>
/// <reference path="osgiHelpers.ts"/>
/**
 * @module Osgi
 * @main Osgi
 */
var Osgi;
(function (Osgi) {
    var pluginName = 'osgi';
    Osgi._module = angular.module(pluginName, ['bootstrap', 'ngResource', 'ngGrid', 'hawtioCore', 'hawtio-ui']);
    Osgi._module.config(["$routeProvider", function ($routeProvider) {
        $routeProvider.when('/osgi/bundle-list', { templateUrl: 'app/osgi/html/bundle-list.html' }).when('/osgi/bundles', { templateUrl: 'app/osgi/html/bundles.html' }).when('/osgi/bundle/:bundleId', { templateUrl: 'app/osgi/html/bundle.html' }).when('/osgi/services', { templateUrl: 'app/osgi/html/services.html' }).when('/osgi/packages', { templateUrl: 'app/osgi/html/packages.html' }).when('/osgi/package/:package/:version', { templateUrl: 'app/osgi/html/package.html' }).when('/osgi/configurations', { templateUrl: 'app/osgi/html/configurations.html' }).when('/osgi/pid/:pid/:factoryPid', { templateUrl: 'app/osgi/html/pid.html' }).when('/osgi/pid/:pid', { templateUrl: 'app/osgi/html/pid.html' }).when('/osgi/fwk', { templateUrl: 'app/osgi/html/framework.html' }).when('/osgi/dependencies', { templateUrl: 'app/osgi/html/svc-dependencies.html', reloadOnSearch: false });
    }]);
    Osgi._module.run(["workspace", "viewRegistry", "helpRegistry", function (workspace, viewRegistry, helpRegistry) {
        viewRegistry['osgi'] = "app/osgi/html/layoutOsgi.html";
        helpRegistry.addUserDoc('osgi', 'app/osgi/doc/help.md', function () {
            return workspace.treeContainsDomainAndProperties("osgi.core");
        });
        workspace.topLevelTabs.push({
            id: "osgi",
            content: "OSGi",
            title: "Visualise and manage the bundles and services in this OSGi container",
            isValid: function (workspace) { return workspace.treeContainsDomainAndProperties("osgi.core"); },
            href: function () { return "#/osgi/bundle-list"; },
            isActive: function (workspace) { return workspace.isLinkActive("osgi"); }
        });
    }]);
    Osgi._module.factory('osgiDataService', ["workspace", "jolokia", function (workspace, jolokia) {
        return new Osgi.OsgiDataService(workspace, jolokia);
    }]);
    hawtioPluginLoader.addModule(pluginName);
})(Osgi || (Osgi = {}));

/// <reference path="../../includes.ts"/>
/// <reference path="osgiHelpers.ts"/>
var Osgi;
(function (Osgi) {
    Osgi.TopLevelController = Osgi._module.controller("Osgi.TopLevelController", ["$scope", "workspace", function ($scope, workspace) {
        $scope.frameworkMBean = Osgi.getSelectionFrameworkMBean(workspace);
        $scope.bundleMBean = Osgi.getSelectionBundleMBean(workspace);
        $scope.serviceMBean = Osgi.getSelectionServiceMBean(workspace);
        $scope.packageMBean = Osgi.getSelectionPackageMBean(workspace);
        $scope.configAdminMBean = Osgi.getSelectionConfigAdminMBean(workspace);
        $scope.metaTypeMBean = Osgi.getMetaTypeMBean(workspace);
        $scope.osgiToolsMBean = Osgi.getHawtioOSGiToolsMBean(workspace);
        $scope.hawtioConfigAdminMBean = Osgi.getHawtioConfigAdminMBean(workspace);
        $scope.scrMBean = Karaf.getSelectionScrMBean(workspace);
        $scope.featuresMBean = Karaf.getSelectionFeaturesMBean(workspace);
    }]);
})(Osgi || (Osgi = {}));

/// <reference path="../../includes.ts"/>
/// <reference path="osgiHelpers.ts"/>
/**
 * @module Osgi
 */
var Osgi;
(function (Osgi) {
    Osgi._module.controller("Osgi.PackageController", ["$scope", "$filter", "workspace", "$routeParams", function ($scope, $filter, workspace, $routeParams) {
        $scope.package = $routeParams.package;
        $scope.version = $routeParams.version;
        updateTableContents();
        function populateTable(response) {
            var packages = Osgi.defaultPackageValues(workspace, $scope, response.value);
            $scope.row = packages.filter({ "Name": $scope.package, "Version": $scope.version })[0];
            Core.$apply($scope);
        }
        ;
        function updateTableContents() {
            var mbean = Osgi.getSelectionPackageMBean(workspace);
            if (mbean) {
                var jolokia = workspace.jolokia;
                jolokia.request({ type: 'exec', mbean: mbean, operation: 'listPackages' }, Core.onSuccess(populateTable));
            }
        }
    }]);
})(Osgi || (Osgi = {}));

/// <reference path="../../includes.ts"/>
/// <reference path="osgiHelpers.ts"/>
/**
 * @module Osgi
 */
var Osgi;
(function (Osgi) {
    Osgi.PackagesController = Osgi._module.controller("Osgi.PackagesController", ["$scope", "$filter", "workspace", "$templateCache", "$compile", function ($scope, $filter, workspace, $templateCache, $compile) {
        var dateFilter = $filter('date');
        $scope.widget = new DataTable.TableWidget($scope, $templateCache, $compile, [
            {
                "mDataProp": null,
                "sClass": "control center",
                "sDefaultContent": '<i class="icon-plus"></i>'
            },
            { "mDataProp": "Name" },
            { "mDataProp": "VersionLink" },
            { "mDataProp": "RemovalPending" }
        ], {
            rowDetailTemplateId: 'packageBundlesTemplate',
            disableAddColumns: true
        });
        $scope.$watch('workspace.selection', function () {
            updateTableContents();
        });
        function populateTable(response) {
            var packages = Osgi.defaultPackageValues(workspace, $scope, response.value);
            augmentPackagesInfo(packages);
        }
        function augmentPackagesInfo(packages) {
            var bundleMap = {};
            var createBundleMap = function (response) {
                angular.forEach(response.value, function (value, key) {
                    var obj = {
                        Identifier: value.Identifier,
                        Name: "",
                        SymbolicName: value.SymbolicName,
                        State: value.State,
                        Version: value.Version,
                        LastModified: value.LastModified,
                        Location: value.Location
                    };
                    if (value.Headers['Bundle-Name']) {
                        obj.Name = value.Headers['Bundle-Name']['Value'];
                    }
                    bundleMap[obj.Identifier] = obj;
                });
                angular.forEach(packages, function (p, key) {
                    angular.forEach(p["ExportingBundles"], function (b, key) {
                        p["ExportingBundles"][key] = bundleMap[b];
                    });
                    angular.forEach(p["ImportingBundles"], function (b, key) {
                        p["ImportingBundles"][key] = bundleMap[b];
                    });
                });
                $scope.widget.populateTable(packages);
                Core.$apply($scope);
            };
            workspace.jolokia.request({
                type: 'exec',
                mbean: Osgi.getSelectionBundleMBean(workspace),
                operation: 'listBundles()'
            }, {
                success: createBundleMap,
                error: createBundleMap
            });
        }
        function updateTableContents() {
            var mbean = Osgi.getSelectionPackageMBean(workspace);
            if (mbean) {
                var jolokia = workspace.jolokia;
                // bundles first:
                jolokia.request({
                    type: 'exec',
                    mbean: mbean,
                    operation: 'listPackages'
                }, Core.onSuccess(populateTable));
            }
        }
    }]);
})(Osgi || (Osgi = {}));

/// <reference path="../../includes.ts"/>
/// <reference path="osgiHelpers.ts"/>
/**
 * @module Osgi
 */
var Osgi;
(function (Osgi) {
    Osgi._module.controller("Osgi.PidController", ["$scope", "$timeout", "$routeParams", "$location", "workspace", "jolokia", function ($scope, $timeout, $routeParams, $location, workspace, jolokia) {
        $scope.deletePropDialog = new UI.Dialog();
        $scope.deletePidDialog = new UI.Dialog();
        $scope.addPropertyDialog = new UI.Dialog();
        $scope.factoryPid = $routeParams.factoryPid;
        $scope.pid = $routeParams.pid;
        $scope.createForm = {
            pidInstanceName: null
        };
        $scope.newPid = $scope.factoryPid && !$scope.pid;
        if ($scope.newPid) {
            $scope.editMode = true;
        }
        if ($scope.pid && !$scope.factoryPid) {
            var idx = $scope.pid.indexOf("-");
            if (idx > 0) {
                $scope.factoryPid = $scope.pid.substring(0, idx);
                $scope.factoryInstanceName = $scope.pid.substring(idx + 1, $scope.pid.length);
            }
        }
        $scope.selectValues = {};
        $scope.modelLoaded = false;
        $scope.canSave = false;
        $scope.setEditMode = function (flag) {
            $scope.editMode = flag;
            $scope.formMode = flag ? "edit" : "view";
            if (!flag || !$scope.entity) {
                $scope.entity = {};
                updateTableContents();
            }
        };
        var startInEditMode = $scope.factoryPid && !$routeParams.pid;
        $scope.setEditMode(startInEditMode);
        $scope.$on("hawtio.form.modelChange", function () {
            if ($scope.modelLoaded) {
                // TODO lets check if we've really changed the values!
                enableCanSave();
                Core.$apply($scope);
            }
        });
        Osgi.initProfileScope($scope, $routeParams, $location, localStorage, jolokia, workspace, function () {
            updateTableContents();
        });
        function updatePid(mbean, pid, data) {
            var completeFn = function (response) {
                Core.notification("success", "Successfully updated pid: " + pid);
                if (pid && $scope.factoryPid && $scope.newPid) {
                    // we've just created a new pid so lets move to the full pid URL
                    var newPath = Osgi.createConfigPidPath($scope, pid);
                    $location.path(newPath);
                }
                else {
                    $scope.setEditMode(false);
                    $scope.canSave = false;
                    $scope.saved = true;
                }
            };
            var callback = Core.onSuccess(completeFn, errorHandler("Failed to update: " + pid));
            if ($scope.inFabricProfile) {
                jolokia.execute(Fabric.managerMBean, "setProfileProperties", $scope.versionId, $scope.profileId, pid, data, callback);
            }
            else {
                var json = JSON.stringify(data);
                $scope.jolokia.execute(mbean, "configAdminUpdate", pid, json, callback);
            }
        }
        $scope.pidSave = function () {
            var data = {};
            angular.forEach($scope.entity, function (value, key) {
                var text = undefined;
                if (angular.isString(value)) {
                    text = value;
                }
                else if (angular.isDefined(value)) {
                    text = value.toString();
                }
                if (angular.isDefined(text)) {
                    data[decodeKey(key, $scope.pid)] = text;
                }
            });
            //log.info("about to update value " + angular.toJson(data));
            var mbean = Osgi.getHawtioConfigAdminMBean(workspace);
            if (mbean || $scope.inFabricProfile) {
                var pidMBean = Osgi.getSelectionConfigAdminMBean($scope.workspace);
                var pid = $scope.pid;
                var zkPid = $scope.zkPid;
                var factoryPid = $scope.factoryPid;
                if (!$scope.inFabricProfile && factoryPid && pidMBean && !zkPid) {
                    // lets generate a new pid
                    $scope.jolokia.execute(pidMBean, "createFactoryConfiguration", factoryPid, Core.onSuccess(function (response) {
                        pid = response;
                        if (pid) {
                            updatePid(mbean, pid, data);
                        }
                    }, errorHandler("Failed to create new PID: ")));
                }
                else {
                    if ($scope.newPid) {
                        var pidInstanceName = $scope.createForm.pidInstanceName;
                        if (!pidInstanceName || !factoryPid) {
                            return;
                        }
                        pid = factoryPid + "-" + pidInstanceName;
                    }
                    else if (zkPid) {
                        pid = zkPid;
                    }
                    updatePid(mbean, pid, data);
                }
            }
        };
        function errorHandler(message) {
            return {
                error: function (response) {
                    Core.notification("error", message + "\n" + response['error'] || response);
                    Core.defaultJolokiaErrorHandler(response);
                }
            };
        }
        function enableCanSave() {
            if ($scope.editMode) {
                $scope.canSave = true;
            }
        }
        $scope.addPropertyConfirmed = function (key, value) {
            $scope.addPropertyDialog.close();
            $scope.configValues[key] = {
                Key: key,
                Value: value,
                Type: "String"
            };
            enableCanSave();
            updateSchema();
        };
        $scope.deletePidProp = function (e) {
            $scope.deleteKey = e.Key;
            $scope.deletePropDialog.open();
        };
        $scope.deletePidPropConfirmed = function () {
            $scope.deletePropDialog.close();
            var cell = document.getElementById("pid." + $scope.deleteKey);
            cell.parentElement.remove();
            enableCanSave();
        };
        $scope.deletePidConfirmed = function () {
            $scope.deletePidDialog.close();
            function errorFn(response) {
                Core.notification("error", response.error);
            }
            function successFn(response) {
                Core.notification("success", "Successfully deleted pid: " + $scope.pid);
                $location.path($scope.configurationsLink);
            }
            if ($scope.inFabricProfile) {
                if ($scope.pid) {
                    var configFile = $scope.pid + ".properties";
                    jolokia.execute(Fabric.managerMBean, "deleteConfigurationFile", $scope.versionId, $scope.profileId, configFile, Core.onSuccess(successFn, { error: errorFn }));
                }
            }
            else {
                var mbean = Osgi.getSelectionConfigAdminMBean($scope.workspace);
                if (mbean) {
                    $scope.jolokia.request({
                        type: "exec",
                        mbean: mbean,
                        operation: 'delete',
                        arguments: [$scope.pid]
                    }, {
                        error: errorFn,
                        success: successFn
                    });
                }
            }
        };
        function populateTable(response) {
            $scope.modelLoaded = true;
            var configValues = response || {};
            $scope.configValues = configValues;
            $scope.zkPid = Core.pathGet(configValues, ["fabric.zookeeper.pid", "Value"]);
            if ($scope.zkPid && $scope.saved) {
                // lets load the current properties direct from git
                // in case we have just saved them into git and config admin hasn't yet
                // quite caught up yet (to avoid freaking the user out that things look like
                // changes got reverted ;)
                function onProfileProperties(gitProperties) {
                    angular.forEach(gitProperties, function (value, key) {
                        var configProperty = configValues[key];
                        if (configProperty) {
                            configProperty.Value = value;
                        }
                    });
                    updateSchemaAndLoadMetaType();
                    Core.$apply($scope);
                }
                jolokia.execute(Fabric.managerMBean, "getProfileProperties", $scope.versionId, $scope.profileId, $scope.zkPid, Core.onSuccess(onProfileProperties));
            }
            else {
                updateSchemaAndLoadMetaType();
            }
        }
        function updateSchemaAndLoadMetaType() {
            updateSchema();
            var configValues = $scope.configValues;
            if (configValues) {
                if ($scope.profileNotRunning && $scope.profileMetadataMBean && $scope.versionId && $scope.profileId) {
                    var pid = $scope.factoryPid || $scope.pid;
                    jolokia.execute($scope.profileMetadataMBean, "getPidMetaTypeObject", $scope.versionId, $scope.profileId, pid, Core.onSuccess(onMetaType));
                }
                else {
                    var locale = null;
                    var pid = null;
                    var factoryId = configValues["service.factoryPid"];
                    if (factoryId && !pid) {
                        pid = factoryId["Value"];
                    }
                    var metaTypeMBean = Osgi.getMetaTypeMBean($scope.workspace);
                    if (metaTypeMBean) {
                        $scope.jolokia.execute(metaTypeMBean, "getPidMetaTypeObject", pid, locale, Core.onSuccess(onMetaType));
                    }
                }
            }
            Core.$apply($scope);
        }
        function onMetaType(response) {
            $scope.metaType = response;
            updateSchema();
            Core.$apply($scope);
        }
        /**
         * Updates the JSON schema model
         */
        function updateSchema() {
            var properties = {};
            var required = [];
            $scope.defaultValues = {};
            var schema = {
                type: "object",
                required: required,
                properties: properties
            };
            var inputClass = "span12";
            var labelClass = "control-label";
            //var inputClassArray = "span11";
            var inputClassArray = "";
            var labelClassArray = labelClass;
            var metaType = $scope.metaType;
            if (metaType) {
                var pidMetadata = Osgi.configuration.pidMetadata;
                var pid = metaType.id;
                schema["id"] = pid;
                schema["name"] = Core.pathGet(pidMetadata, [pid, "name"]) || metaType.name;
                schema["description"] = Core.pathGet(pidMetadata, [pid, "description"]) || metaType.description;
                var disableHumanizeLabel = Core.pathGet(pidMetadata, [pid, "schemaExtensions", "disableHumanizeLabel"]);
                angular.forEach(metaType.attributes, function (attribute) {
                    var id = attribute.id;
                    if (isValidProperty(id)) {
                        var key = encodeKey(id, pid);
                        var typeName = asJsonSchemaType(attribute.typeName, attribute.id);
                        var attributeProperties = {
                            title: attribute.name,
                            tooltip: attribute.description,
                            'input-attributes': {
                                class: inputClass
                            },
                            'label-attributes': {
                                class: labelClass
                            },
                            type: typeName
                        };
                        if (disableHumanizeLabel) {
                            attributeProperties.title = id;
                        }
                        if (attribute.typeName === "char") {
                            attributeProperties["maxLength"] = 1;
                            attributeProperties["minLength"] = 1;
                        }
                        var cardinality = attribute.cardinality;
                        if (cardinality) {
                            // lets clear the span on arrays to fix layout issues
                            attributeProperties['input-attributes']['class'] = null;
                            attributeProperties.type = "array";
                            attributeProperties["items"] = {
                                'input-attributes': {
                                    class: inputClassArray
                                },
                                'label-attributes': {
                                    class: labelClassArray
                                },
                                "type": typeName
                            };
                        }
                        if (attribute.required) {
                            required.push(id);
                        }
                        var defaultValue = attribute.defaultValue;
                        if (defaultValue) {
                            if (angular.isArray(defaultValue) && defaultValue.length === 1) {
                                defaultValue = defaultValue[0];
                            }
                            //attributeProperties["default"] = defaultValue;
                            // TODO convert to boolean / number?
                            $scope.defaultValues[key] = defaultValue;
                        }
                        var optionLabels = attribute.optionLabels;
                        var optionValues = attribute.optionValues;
                        if (optionLabels && optionLabels.length && optionValues && optionValues.length) {
                            var enumObject = {};
                            for (var i = 0; i < optionLabels.length; i++) {
                                var label = optionLabels[i];
                                var value = optionValues[i];
                                enumObject[value] = label;
                            }
                            $scope.selectValues[key] = enumObject;
                            Core.pathSet(attributeProperties, ['input-element'], "select");
                            Core.pathSet(attributeProperties, ['input-attributes', "ng-options"], "key as value for (key, value) in selectValues." + key);
                        }
                        properties[key] = attributeProperties;
                    }
                });
                // now lets override anything from the custom metadata
                var schemaExtensions = Core.pathGet(Osgi.configuration.pidMetadata, [pid, "schemaExtensions"]);
                if (schemaExtensions) {
                    // now lets copy over the schema extensions
                    overlayProperties(schema, schemaExtensions);
                }
            }
            // now add all the missing properties...
            var entity = {};
            angular.forEach($scope.configValues, function (value, rawKey) {
                if (isValidProperty(rawKey)) {
                    var key = encodeKey(rawKey, pid);
                    var attrValue = value;
                    var attrType = "string";
                    if (angular.isObject(value)) {
                        attrValue = value.Value;
                        attrType = asJsonSchemaType(value.Type, rawKey);
                    }
                    var property = properties[key];
                    if (!property) {
                        property = {
                            'input-attributes': {
                                class: inputClass
                            },
                            'label-attributes': {
                                class: labelClass
                            },
                            type: attrType
                        };
                        properties[key] = property;
                    }
                    else {
                        var propertyType = property["type"];
                        if ("array" === propertyType) {
                            if (!angular.isArray(attrValue)) {
                                attrValue = attrValue ? attrValue.split(",") : [];
                            }
                        }
                    }
                    if (disableHumanizeLabel) {
                        property.title = rawKey;
                    }
                    //comply with Forms.safeIdentifier in 'forms/js/formHelpers.ts'
                    key = key.replace(/-/g, "_");
                    entity[key] = attrValue;
                }
            });
            // add default values for missing values
            angular.forEach($scope.defaultValues, function (value, key) {
                var current = entity[key];
                if (!angular.isDefined(current)) {
                    //log.info("updating entity " + key + " with default: " + value + " as was: " + current);
                    entity[key] = value;
                }
            });
            //log.info("default values: " + angular.toJson($scope.defaultValues));
            $scope.entity = entity;
            $scope.schema = schema;
            $scope.fullSchema = schema;
        }
        /**
         * Recursively overlays the properties in the overlay into the object; so any atttributes are added into the object
         * and any nested objects in the overlay are inserted into the object at the correct path.
         */
        function overlayProperties(object, overlay) {
            if (angular.isObject(object)) {
                if (angular.isObject(overlay)) {
                    angular.forEach(overlay, function (value, key) {
                        if (angular.isObject(value)) {
                            var child = object[key];
                            if (!child) {
                                child = {};
                                object[key] = child;
                            }
                            overlayProperties(child, value);
                        }
                        else {
                            object[key] = value;
                        }
                    });
                }
            }
        }
        var ignorePropertyIds = ["service.pid", "service.factoryPid", "fabric.zookeeper.pid"];
        function isValidProperty(id) {
            return id && ignorePropertyIds.indexOf(id) < 0;
        }
        function encodeKey(key, pid) {
            return key.replace(/\./g, "__");
        }
        function decodeKey(key, pid) {
            return key.replace(/__/g, ".");
        }
        function asJsonSchemaType(typeName, id) {
            if (typeName) {
                var lower = typeName.toLowerCase();
                if (lower.startsWith("int") || lower === "long" || lower === "short" || lower === "byte" || lower.endsWith("int")) {
                    return "integer";
                }
                if (lower === "double" || lower === "float" || lower === "bigdecimal") {
                    return "number";
                }
                if (lower === "string") {
                    // TODO hack to try force password type on dodgy metadata such as pax web
                    if (id && id.endsWith("password")) {
                        return "password";
                    }
                    return "string";
                }
                return typeName;
            }
            else {
                return "string";
            }
        }
        function onProfilePropertiesLoaded(response) {
            $scope.modelLoaded = true;
            var configValues = {};
            $scope.configValues = configValues;
            angular.forEach(response, function (value, oKey) {
                // lets remove any dodgy characters
                var key = oKey.replace(/:/g, '_').replace(/\//g, '_');
                configValues[key] = {
                    Key: key,
                    Value: value
                };
            });
            $scope.zkPid = Core.pathGet(configValues, ["fabric.zookeeper.pid", "Value"]);
            updateSchemaAndLoadMetaType();
            Core.$apply($scope);
        }
        function updateTableContents() {
            $scope.modelLoaded = false;
            if ($scope.inFabricProfile || $scope.profileNotRunning) {
                jolokia.execute(Fabric.managerMBean, "getOverlayProfileProperties", $scope.versionId, $scope.profileId, $scope.pid, Core.onSuccess(onProfilePropertiesLoaded));
            }
            else {
                Osgi.getConfigurationProperties($scope.workspace, $scope.jolokia, $scope.pid, populateTable);
            }
        }
    }]);
})(Osgi || (Osgi = {}));

/// <reference path="../../includes.ts"/>
/// <reference path="osgiHelpers.ts"/>
/**
 * @module Osgi
 */
var Osgi;
(function (Osgi) {
    Osgi.ServiceController = Osgi._module.controller("Osgi.ServiceController", ["$scope", "$filter", "workspace", "$templateCache", "$compile", function ($scope, $filter, workspace, $templateCache, $compile) {
        var dateFilter = $filter('date');
        $scope.widget = new DataTable.TableWidget($scope, $templateCache, $compile, [
            {
                "mDataProp": null,
                "sClass": "control center",
                "sDefaultContent": '<i class="icon-plus"></i>'
            },
            { "mDataProp": "Identifier" },
            { "mDataProp": "BundleIdentifier" },
            { "mDataProp": "objectClass" }
        ], {
            rowDetailTemplateId: 'osgiServiceTemplate',
            disableAddColumns: true
        });
        $scope.$watch('workspace.selection', function () {
            var mbean = Osgi.getSelectionServiceMBean(workspace);
            if (mbean) {
                var jolokia = workspace.jolokia;
                jolokia.request({
                    type: 'exec',
                    mbean: mbean,
                    operation: 'listServices()'
                }, Core.onSuccess(populateTable));
            }
        });
        var populateTable = function (response) {
            var services = Osgi.defaultServiceValues(workspace, $scope, response.value);
            augmentServicesInfo(services);
        };
        function augmentServicesInfo(services) {
            var bundleMap = {};
            var createBundleMap = function (response) {
                angular.forEach(response.value, function (value, key) {
                    var obj = {
                        Identifier: value.Identifier,
                        Name: "",
                        SymbolicName: value.SymbolicName,
                        State: value.State,
                        Version: value.Version,
                        LastModified: value.LastModified,
                        Location: value.Location
                    };
                    if (value.Headers['Bundle-Name']) {
                        obj.Name = value.Headers['Bundle-Name']['Value'];
                    }
                    bundleMap[obj.Identifier] = obj;
                });
                angular.forEach(services, function (s, key) {
                    angular.forEach(s["UsingBundles"], function (b, key) {
                        s["UsingBundles"][key] = bundleMap[b];
                    });
                });
                $scope.widget.populateTable(services);
                Core.$apply($scope);
            };
            workspace.jolokia.request({
                type: 'exec',
                mbean: Osgi.getSelectionBundleMBean(workspace),
                operation: 'listBundles()'
            }, {
                success: createBundleMap,
                error: createBundleMap
            });
        }
    }]);
})(Osgi || (Osgi = {}));

/// <reference path="../../includes.ts"/>
/// <reference path="osgiHelpers.ts"/>
/**
 * @module Osgi
 */
var Osgi;
(function (Osgi) {
    Osgi._module.controller("Osgi.ServiceDependencyController", ["$scope", "$location", "$routeParams", "workspace", "osgiDataService", function ($scope, $location, $routeParams, workspace, osgiDataService) {
        $scope.init = function () {
            if ($routeParams["bundleFilter"]) {
                $scope.bundleFilter = $routeParams["bundleFilter"];
            }
            else {
                $scope.bundleFilter = "";
            }
            if ($routeParams["pkgFilter"]) {
                $scope.packageFilter = $routeParams["pkgFilter"];
            }
            else {
                $scope.packageFilter = "";
            }
            if ($routeParams["view"] == "packages") {
                $scope.selectView = "packages";
            }
            else {
                $scope.selectView = "services";
            }
            if ($routeParams['hideUnused']) {
                $scope.hideUnused = $routeParams['hideUnused'] == "true";
            }
            else {
                $scope.hideUnused = true;
            }
        };
        $scope.updateLink = function () {
            var search = $location.search;
            if ($scope.bundleFilter && $scope.bundleFilter != "") {
                search["bundleFilter"] = $scope.bundleFilter;
            }
            else {
                delete search["bundleFilter"];
            }
            if ($scope.packageFilter && $scope.packageFilter != "") {
                search["pkgFilter"] = $scope.packageFilter;
            }
            else {
                delete search["pkgFilter"];
            }
            search["view"] = $scope.selectView;
            if ($scope.hideUnused) {
                search["hideUnused"] = "true";
            }
            else {
                search["hideUnused"] = "false";
            }
            $location.search(search);
        };
        $scope.addToDashboardLink = function () {
            var routeParams = angular.toJson($routeParams);
            var href = "#/osgi/dependencies";
            var title = "OSGi dependencies";
            var size = angular.toJson({
                size_x: 2,
                size_y: 2
            });
            var addLink = "#/dashboard/add?tab=dashboard" + "&href=" + encodeURIComponent(href) + "&routeParams=" + encodeURIComponent(routeParams) + "&size=" + encodeURIComponent(size) + "&title=" + encodeURIComponent(title);
            return addLink;
        };
        $scope.$on('$routeUpdate', function () {
            var search = $location.search;
            if (search["bundleFilter"]) {
                $scope.bundleFilter = $routeParams["bundleFilter"];
            }
            else {
                $scope.bundleFilter = "";
            }
            if (search["pkgFilter"]) {
                $scope.packageFilter = $routeParams["pkgFilter"];
            }
            else {
                $scope.packageFilter = "";
            }
            if (search["view"] == "packages") {
                $scope.selectView = "packages";
            }
            else {
                $scope.selectView = "services";
            }
            if (search['hideUnused']) {
                $scope.hideUnused = $routeParams['hideUnused'] == "true";
            }
            else {
                $scope.hideUnused = true;
            }
            $scope.updateLink();
            $scope.updateGraph();
        });
        $scope.updateGraph = function () {
            $scope.updateLink();
            $scope.updatePkgFilter();
            var graphBuilder = new Osgi.OsgiGraphBuilder(osgiDataService, $scope.bundleFilter, $scope.packageFilter, $scope.selectView == "services", $scope.selectView == "packages", $scope.hideUnused);
            $scope.graph = graphBuilder.buildGraph();
            Core.$apply($scope);
        };
        $scope.updatePkgFilter = function () {
            if ($scope.packageFilter == null || $scope.packageFilter == "") {
                $scope.selectView = "services";
                $scope.disablePkg = true;
            }
            else {
                $scope.disablePkg = false;
            }
        };
        $scope.init();
        $scope.updateGraph();
    }]);
})(Osgi || (Osgi = {}));

/// <reference path="../../includes.ts"/>
/// <reference path="../../git/ts/gitHelpers.ts"/>
/// <reference path="wikiHelpers.ts"/>
/**
 * @module Wiki
 * @main Wiki
 */
var Wiki;
(function (Wiki) {
    Wiki.pluginName = 'wiki';
    Wiki.templatePath = 'app/wiki/html/';
    Wiki.tab = null;
    Wiki._module = angular.module(Wiki.pluginName, ['bootstrap', 'ui.bootstrap.dialog', 'ui.bootstrap.tabs', 'ngResource', 'hawtioCore', 'hawtio-ui', 'tree', 'camel']);
    Wiki.controller = PluginHelpers.createControllerFunction(Wiki._module, 'Wiki');
    Wiki.route = PluginHelpers.createRoutingFunction(Wiki.templatePath);
    Wiki._module.config(["$routeProvider", function ($routeProvider) {
        // allow optional branch paths...
        angular.forEach(["", "/branch/:branch"], function (path) {
            $routeProvider.when(UrlHelpers.join('/wiki', path, 'view'), Wiki.route('viewPage.html', false)).when(UrlHelpers.join('/wiki', path, 'create/*page'), Wiki.route('create.html', false)).when('/wiki' + path + '/view/*page', { templateUrl: 'app/wiki/html/viewPage.html', reloadOnSearch: false }).when('/wiki' + path + '/book/*page', { templateUrl: 'app/wiki/html/viewBook.html', reloadOnSearch: false }).when('/wiki' + path + '/edit/*page', { templateUrl: 'app/wiki/html/editPage.html' }).when('/wiki' + path + '/version/*page/:objectId', { templateUrl: 'app/wiki/html/viewPage.html' }).when('/wiki' + path + '/history/*page', { templateUrl: 'app/wiki/html/history.html' }).when('/wiki' + path + '/commit/*page/:objectId', { templateUrl: 'app/wiki/html/commit.html' }).when('/wiki' + path + '/diff/*page/:objectId/:baseObjectId', { templateUrl: 'app/wiki/html/viewPage.html', reloadOnSearch: false }).when('/wiki' + path + '/formTable/*page', { templateUrl: 'app/wiki/html/formTable.html' }).when('/wiki' + path + '/dozer/mappings/*page', { templateUrl: 'app/wiki/html/dozerMappings.html' }).when('/wiki' + path + '/configurations/*page', { templateUrl: 'app/wiki/html/configurations.html' }).when('/wiki' + path + '/configuration/:pid/*page', { templateUrl: 'app/wiki/html/configuration.html' }).when('/wiki' + path + '/newConfiguration/:factoryPid/*page', { templateUrl: 'app/wiki/html/configuration.html' }).when('/wiki' + path + '/camel/diagram/*page', { templateUrl: 'app/wiki/html/camelDiagram.html' }).when('/wiki' + path + '/camel/canvas/*page', { templateUrl: 'app/wiki/html/camelCanvas.html' }).when('/wiki' + path + '/camel/properties/*page', { templateUrl: 'app/wiki/html/camelProperties.html' });
        });
    }]);
    Wiki._module.factory('wikiRepository', ["workspace", "jolokia", "localStorage", function (workspace, jolokia, localStorage) {
        return new Wiki.GitWikiRepository(function () { return Git.createGitRepository(workspace, jolokia, localStorage); });
    }]);
    Wiki._module.factory('wikiBranchMenu', function () {
        var self = {
            items: [],
            addExtension: function (item) {
                self.items.push(item);
            },
            applyMenuExtensions: function (menu) {
                if (self.items.length === 0) {
                    return;
                }
                var extendedMenu = [{
                    heading: "Actions"
                }];
                self.items.forEach(function (item) {
                    if (item.valid()) {
                        extendedMenu.push(item);
                    }
                });
                if (extendedMenu.length > 1) {
                    menu.add(extendedMenu);
                }
            }
        };
        return self;
    });
    Wiki._module.factory('fileExtensionTypeRegistry', function () {
        return {
            "image": ["svg", "png", "ico", "bmp", "jpg", "gif"],
            "markdown": ["md", "markdown", "mdown", "mkdn", "mkd"],
            "htmlmixed": ["html", "xhtml", "htm"],
            "text/x-java": ["java"],
            "text/x-scala": ["scala"],
            "javascript": ["js", "json", "javascript", "jscript", "ecmascript", "form"],
            "xml": ["xml", "xsd", "wsdl", "atom"],
            "properties": ["properties"]
        };
    });
    Wiki._module.filter('fileIconClass', function () { return Wiki.iconClass; });
    Wiki._module.run(["$location", "workspace", "viewRegistry", "jolokia", "localStorage", "layoutFull", "helpRegistry", "preferencesRegistry", "wikiRepository", "postLoginTasks", "$rootScope", function ($location, workspace, viewRegistry, jolokia, localStorage, layoutFull, helpRegistry, preferencesRegistry, wikiRepository, postLoginTasks, $rootScope) {
        viewRegistry['wiki'] = Wiki.templatePath + 'layoutWiki.html';
        helpRegistry.addUserDoc('wiki', 'app/wiki/doc/help.md', function () {
            return Wiki.isWikiEnabled(workspace, jolokia, localStorage);
        });
        preferencesRegistry.addTab("Git", 'app/wiki/html/gitPreferences.html');
        Wiki.tab = {
            id: "wiki",
            content: "Wiki",
            title: "View and edit wiki pages",
            isValid: function (workspace) { return Wiki.isWikiEnabled(workspace, jolokia, localStorage); },
            href: function () { return "#/wiki/view"; },
            isActive: function (workspace) { return workspace.isLinkActive("/wiki") && !workspace.linkContains("fabric", "profiles") && !workspace.linkContains("editFeatures"); }
        };
        workspace.topLevelTabs.push(Wiki.tab);
        postLoginTasks.addTask('wikiGetRepositoryLabel', function () {
            wikiRepository.getRepositoryLabel(function (label) {
                Wiki.tab.content = label;
                Core.$apply($rootScope);
            }, function (response) {
                // silently ignore
            });
        });
        // add empty regexs to templates that don't define
        // them so ng-pattern doesn't barf
        Wiki.documentTemplates.forEach(function (template) {
            if (!template['regex']) {
                template.regex = /(?:)/;
            }
        });
    }]);
    hawtioPluginLoader.addModule(Wiki.pluginName);
})(Wiki || (Wiki = {}));

/// <reference path="../../includes.ts"/>
/// <reference path="../../git/ts/gitHelpers.ts"/>
/// <reference path="wikiHelpers.ts"/>
/// <reference path="wikiPlugin.ts"/>
/**
 * @module Wiki
 */
var Wiki;
(function (Wiki) {
    Wiki._module.controller("Wiki.CamelController", ["$scope", "$location", "$routeParams", "localStorage", "workspace", "wikiRepository", "jolokia", function ($scope, $location, $routeParams, localStorage, workspace, wikiRepository, jolokia) {
        Wiki.initScope($scope, $routeParams, $location);
        Camel.initEndpointChooserScope($scope, $location, localStorage, workspace, jolokia);
        $scope.schema = Camel.getConfiguredCamelModel();
        $scope.modified = false;
        $scope.findProfileCamelContext = true;
        $scope.camelSelectionDetails = {
            selectedCamelContextId: null,
            selectedRouteId: null
        };
        $scope.isValid = function (nav) {
            return nav && nav.isValid(workspace);
        };
        $scope.camelSubLevelTabs = [
            {
                content: '<i class="icon-picture"></i> Canvas',
                title: "Edit the diagram in a draggy droppy way",
                isValid: function (workspace) { return true; },
                href: function () { return Wiki.startLink($scope.branch) + "/camel/canvas/" + $scope.pageId; }
            },
            {
                content: '<i class=" icon-sitemap"></i> Tree',
                title: "View the routes as a tree",
                isValid: function (workspace) { return true; },
                href: function () { return Wiki.startLink($scope.branch) + "/camel/properties/" + $scope.pageId; }
            },
        ];
        var routeModel = _apacheCamelModel.definitions.route;
        routeModel["_id"] = "route";
        $scope.addDialog = new UI.Dialog();
        // TODO doesn't seem that angular-ui uses these?
        $scope.addDialog.options["dialogClass"] = "modal-large";
        $scope.addDialog.options["cssClass"] = "modal-large";
        $scope.paletteItemSearch = "";
        $scope.paletteTree = new Folder("Palette");
        $scope.paletteActivations = ["Routing_aggregate"];
        // load $scope.paletteTree
        angular.forEach(_apacheCamelModel.definitions, function (value, key) {
            if (value.group) {
                var group = (key === "route") ? $scope.paletteTree : $scope.paletteTree.getOrElse(value.group);
                if (!group.key) {
                    group.key = value.group;
                }
                value["_id"] = key;
                var title = value["title"] || key;
                var node = new Folder(title);
                node.key = group.key + "_" + key;
                node["nodeModel"] = value;
                var imageUrl = Camel.getRouteNodeIcon(value);
                node.icon = imageUrl;
                // compiler was complaining about 'label' had no idea where it's coming from
                // var tooltip = value["tooltip"] || value["description"] || label;
                var tooltip = value["tooltip"] || value["description"] || '';
                node.tooltip = tooltip;
                group.children.push(node);
            }
        });
        // load $scope.componentTree
        $scope.componentTree = new Folder("Endpoints");
        $scope.$watch("componentNames", function () {
            var componentNames = $scope.componentNames;
            if (componentNames && componentNames.length) {
                $scope.componentTree = new Folder("Endpoints");
                angular.forEach($scope.componentNames, function (endpointName) {
                    var category = Camel.getEndpointCategory(endpointName);
                    var groupName = category.label || "Core";
                    var groupKey = category.id || groupName;
                    var group = $scope.componentTree.getOrElse(groupName);
                    var value = Camel.getEndpointConfig(endpointName, category);
                    var key = endpointName;
                    var label = value["label"] || endpointName;
                    var node = new Folder(label);
                    node.key = groupKey + "_" + key;
                    node.key = key;
                    node["nodeModel"] = value;
                    var tooltip = value["tooltip"] || value["description"] || label;
                    var imageUrl = Core.url(value["icon"] || Camel.endpointIcon);
                    node.icon = imageUrl;
                    node.tooltip = tooltip;
                    group.children.push(node);
                });
            }
        });
        $scope.componentActivations = ["bean"];
        $scope.$watch('addDialog.show', function () {
            if ($scope.addDialog.show) {
                setTimeout(function () {
                    $('#submit').focus();
                }, 50);
            }
        });
        $scope.$on("hawtio.form.modelChange", onModelChangeEvent);
        $scope.onRootTreeNode = function (rootTreeNode) {
            $scope.rootTreeNode = rootTreeNode;
            // restore the real data at the root for saving the doc etc
            rootTreeNode.data = $scope.camelContextTree;
        };
        $scope.addNode = function () {
            if ($scope.nodeXmlNode) {
                $scope.addDialog.open();
            }
            else {
                addNewNode(routeModel);
            }
        };
        $scope.onPaletteSelect = function (node) {
            $scope.selectedPaletteNode = (node && node["nodeModel"]) ? node : null;
            if ($scope.selectedPaletteNode) {
                $scope.selectedComponentNode = null;
            }
            console.log("Selected " + $scope.selectedPaletteNode + " : " + $scope.selectedComponentNode);
        };
        $scope.onComponentSelect = function (node) {
            $scope.selectedComponentNode = (node && node["nodeModel"]) ? node : null;
            if ($scope.selectedComponentNode) {
                $scope.selectedPaletteNode = null;
                var nodeName = node.key;
                console.log("loading endpoint schema for node " + nodeName);
                $scope.loadEndpointSchema(nodeName);
                $scope.selectedComponentName = nodeName;
            }
            console.log("Selected " + $scope.selectedPaletteNode + " : " + $scope.selectedComponentNode);
        };
        $scope.selectedNodeModel = function () {
            var nodeModel = null;
            if ($scope.selectedPaletteNode) {
                nodeModel = $scope.selectedPaletteNode["nodeModel"];
                $scope.endpointConfig = null;
            }
            else if ($scope.selectedComponentNode) {
                // TODO lest create an endpoint nodeModel and associate
                // the dummy URL and properties etc...
                var endpointConfig = $scope.selectedComponentNode["nodeModel"];
                var endpointSchema = $scope.endpointSchema;
                nodeModel = $scope.schema.definitions.endpoint;
                $scope.endpointConfig = {
                    key: $scope.selectedComponentNode.key,
                    schema: endpointSchema,
                    details: endpointConfig
                };
            }
            return nodeModel;
        };
        $scope.addAndCloseDialog = function () {
            var nodeModel = $scope.selectedNodeModel();
            if (nodeModel) {
                addNewNode(nodeModel);
            }
            else {
                console.log("WARNING: no nodeModel!");
            }
            $scope.addDialog.close();
        };
        $scope.removeNode = function () {
            if ($scope.selectedFolder && $scope.treeNode) {
                $scope.selectedFolder.detach();
                $scope.treeNode.remove();
                $scope.selectedFolder = null;
                $scope.treeNode = null;
            }
        };
        $scope.canDelete = function () {
            return $scope.selectedFolder ? true : false;
        };
        $scope.isActive = function (nav) {
            if (angular.isString(nav))
                return workspace.isLinkActive(nav);
            var fn = nav.isActive;
            if (fn) {
                return fn(workspace);
            }
            return workspace.isLinkActive(nav.href());
        };
        $scope.save = function () {
            // generate the new XML
            if ($scope.rootTreeNode) {
                var xmlNode = Camel.generateXmlFromFolder($scope.rootTreeNode);
                if (xmlNode) {
                    var text = Core.xmlNodeToString(xmlNode);
                    if (text) {
                        // lets save the file...
                        var commitMessage = $scope.commitMessage || "Updated page " + $scope.pageId;
                        wikiRepository.putPage($scope.branch, $scope.pageId, text, commitMessage, function (status) {
                            Wiki.onComplete(status);
                            Core.notification("success", "Saved " + $scope.pageId);
                            $scope.modified = false;
                            goToView();
                            Core.$apply($scope);
                        });
                    }
                }
            }
        };
        $scope.cancel = function () {
            console.log("cancelling...");
            // TODO show dialog if folks are about to lose changes...
        };
        $scope.$watch('workspace.tree', function () {
            if (!$scope.git) {
                // lets do this asynchronously to avoid Error: $digest already in progress
                //console.log("Reloading the view as we now seem to have a git mbean!");
                setTimeout(updateView, 50);
            }
        });
        $scope.$on("$routeChangeSuccess", function (event, current, previous) {
            // lets do this asynchronously to avoid Error: $digest already in progress
            setTimeout(updateView, 50);
        });
        function getFolderXmlNode(treeNode) {
            var routeXmlNode = Camel.createFolderXmlTree(treeNode, null);
            if (routeXmlNode) {
                $scope.nodeXmlNode = routeXmlNode;
            }
            return routeXmlNode;
        }
        $scope.onNodeSelect = function (folder, treeNode) {
            $scope.selectedFolder = folder;
            $scope.treeNode = treeNode;
            $scope.propertiesTemplate = null;
            $scope.diagramTemplate = null;
            $scope.nodeXmlNode = null;
            if (folder) {
                $scope.nodeData = Camel.getRouteFolderJSON(folder);
                $scope.nodeDataChangedFields = {};
            }
            var nodeName = Camel.getFolderCamelNodeId(folder);
            // lets lazily create the XML tree so it can be used by the diagram
            var routeXmlNode = getFolderXmlNode(treeNode);
            if (nodeName) {
                //var nodeName = routeXmlNode.localName;
                $scope.nodeModel = Camel.getCamelSchema(nodeName);
                if ($scope.nodeModel) {
                    $scope.propertiesTemplate = "app/wiki/html/camelPropertiesEdit.html";
                }
                $scope.diagramTemplate = "app/camel/html/routes.html";
                Core.$apply($scope);
            }
        };
        $scope.onNodeDragEnter = function (node, sourceNode) {
            var nodeFolder = node.data;
            var sourceFolder = sourceNode.data;
            if (nodeFolder && sourceFolder) {
                var nodeId = Camel.getFolderCamelNodeId(nodeFolder);
                var sourceId = Camel.getFolderCamelNodeId(sourceFolder);
                if (nodeId && sourceId) {
                    // we can only drag routes onto other routes (before / after / over)
                    if (sourceId === "route") {
                        return nodeId === "route";
                    }
                    return true;
                }
            }
            return false;
        };
        $scope.onNodeDrop = function (node, sourceNode, hitMode, ui, draggable) {
            var nodeFolder = node.data;
            var sourceFolder = sourceNode.data;
            if (nodeFolder && sourceFolder) {
                // we cannot drop a route into a route or a non-route to a top level!
                var nodeId = Camel.getFolderCamelNodeId(nodeFolder);
                var sourceId = Camel.getFolderCamelNodeId(sourceFolder);
                if (nodeId === "route") {
                    // hitMode must be "over" if we are not another route
                    if (sourceId === "route") {
                        if (hitMode === "over") {
                            hitMode = "after";
                        }
                    }
                    else {
                        // disable before / after
                        hitMode = "over";
                    }
                }
                else {
                    if (Camel.acceptOutput(nodeId)) {
                        hitMode = "over";
                    }
                    else {
                        if (hitMode !== "before") {
                            hitMode = "after";
                        }
                    }
                }
                console.log("nodeDrop nodeId: " + nodeId + " sourceId: " + sourceId + " hitMode: " + hitMode);
                sourceNode.move(node, hitMode);
            }
        };
        updateView();
        function addNewNode(nodeModel) {
            var doc = $scope.doc || document;
            var parentFolder = $scope.selectedFolder || $scope.camelContextTree;
            var key = nodeModel["_id"];
            var beforeNode = null;
            if (!key) {
                console.log("WARNING: no id for model " + JSON.stringify(nodeModel));
            }
            else {
                var treeNode = $scope.treeNode;
                if (key === "route") {
                    // lets add to the root of the tree
                    treeNode = $scope.rootTreeNode;
                }
                else {
                    if (!treeNode) {
                        // lets select the last route - and create a new route if need be
                        var root = $scope.rootTreeNode;
                        var children = root.getChildren();
                        if (!children || !children.length) {
                            addNewNode(Camel.getCamelSchema("route"));
                            children = root.getChildren();
                        }
                        if (children && children.length) {
                            treeNode = children[children.length - 1];
                        }
                        else {
                            console.log("Could not add a new route to the empty tree!");
                            return;
                        }
                    }
                    // if the parent folder likes to act as a pipeline, then add
                    // after the parent, rather than as a child
                    var parentId = Camel.getFolderCamelNodeId(treeNode.data);
                    if (!Camel.acceptOutput(parentId)) {
                        // lets add the new node to the end of the parent
                        beforeNode = treeNode.getNextSibling();
                        treeNode = treeNode.getParent() || treeNode;
                    }
                }
                if (treeNode) {
                    var node = doc.createElement(key);
                    parentFolder = treeNode.data;
                    var addedNode = Camel.addRouteChild(parentFolder, node);
                    if (addedNode) {
                        var added = treeNode.addChild(addedNode, beforeNode);
                        if (added) {
                            getFolderXmlNode(added);
                            added.expand(true);
                            added.select(true);
                            added.activate(true);
                        }
                    }
                }
            }
        }
        function onModelChangeEvent(event, name) {
            // lets filter out events due to the node changing causing the
            // forms to be recreated
            if ($scope.nodeData) {
                var fieldMap = $scope.nodeDataChangedFields;
                if (fieldMap) {
                    if (fieldMap[name]) {
                        onNodeDataChanged();
                    }
                    else {
                        // the selection has just changed so we get the initial event
                        // we can ignore this :)
                        fieldMap[name] = true;
                    }
                }
            }
        }
        function onNodeDataChanged() {
            $scope.modified = true;
            var selectedFolder = $scope.selectedFolder;
            if ($scope.treeNode && selectedFolder) {
                var routeXmlNode = getFolderXmlNode($scope.treeNode);
                if (routeXmlNode) {
                    var nodeName = routeXmlNode.localName;
                    var nodeSettings = Camel.getCamelSchema(nodeName);
                    if (nodeSettings) {
                        // update the title and tooltip etc
                        Camel.updateRouteNodeLabelAndTooltip(selectedFolder, routeXmlNode, nodeSettings);
                        $scope.treeNode.render(false, false);
                    }
                }
                // TODO not sure we need this to be honest
                selectedFolder["camelNodeData"] = $scope.nodeData;
            }
        }
        function onResults(response) {
            var text = response.text;
            if (text) {
                // lets remove any dodgy characters so we can use it as a DOM id
                var tree = Camel.loadCamelTree(text, $scope.pageId);
                if (tree) {
                    $scope.camelContextTree = tree;
                }
            }
            else {
                console.log("No XML found for page " + $scope.pageId);
            }
            Core.$applyLater($scope);
        }
        function updateView() {
            $scope.loadEndpointNames();
            $scope.pageId = Wiki.pageId($routeParams, $location);
            console.log("Has page id: " + $scope.pageId + " with $routeParams " + JSON.stringify($routeParams));
            if (Git.getGitMBean(workspace)) {
                $scope.git = wikiRepository.getPage($scope.branch, $scope.pageId, $scope.objectId, onResults);
            }
        }
        function goToView() {
            // TODO lets navigate to the view if we have a separate view one day :)
            /*
             if ($scope.breadcrumbs && $scope.breadcrumbs.length > 1) {
             var viewLink = $scope.breadcrumbs[$scope.breadcrumbs.length - 2];
             console.log("goToView has found view " + viewLink);
             var path = Core.trimLeading(viewLink, "#");
             $location.path(path);
             } else {
             console.log("goToView has no breadcrumbs!");
             }
             */
        }
    }]);
})(Wiki || (Wiki = {}));

/// <reference path="../../includes.ts"/>
/// <reference path="../../git/ts/gitHelpers.ts"/>
/// <reference path="wikiHelpers.ts"/>
/**
 * @module Wiki
 */
var Wiki;
(function (Wiki) {
    Wiki._module.controller("Wiki.CamelCanvasController", ["$scope", "$element", "workspace", "jolokia", "wikiRepository", "$templateCache", "$interpolate", function ($scope, $element, workspace, jolokia, wikiRepository, $templateCache, $interpolate) {
        var jsPlumbInstance = jsPlumb.getInstance();
        $scope.addDialog = new UI.Dialog();
        $scope.propertiesDialog = new UI.Dialog();
        $scope.modified = false;
        $scope.camelIgnoreIdForLabel = Camel.ignoreIdForLabel(localStorage);
        $scope.camelMaximumLabelWidth = Camel.maximumLabelWidth(localStorage);
        $scope.camelMaximumTraceOrDebugBodyLength = Camel.maximumTraceOrDebugBodyLength(localStorage);
        $scope.forms = {};
        $scope.nodeTemplate = $interpolate($templateCache.get("nodeTemplate"));
        $scope.$watch("camelContextTree", function () {
            var tree = $scope.camelContextTree;
            $scope.rootFolder = tree;
            // now we've got cid values in the tree and DOM, lets create an index so we can bind the DOM to the tree model
            $scope.folders = Camel.addFoldersToIndex($scope.rootFolder);
            var doc = Core.pathGet(tree, ["xmlDocument"]);
            if (doc) {
                $scope.doc = doc;
                reloadRouteIds();
                onRouteSelectionChanged();
            }
        });
        $scope.addAndCloseDialog = function () {
            var nodeModel = $scope.selectedNodeModel();
            if (nodeModel) {
                addNewNode(nodeModel);
            }
            $scope.addDialog.close();
        };
        $scope.removeNode = function () {
            var folder = getSelectedOrRouteFolder();
            if (folder) {
                var nodeName = Camel.getFolderCamelNodeId(folder);
                folder.detach();
                if ("route" === nodeName) {
                    // lets also clear the selected route node
                    $scope.selectedRouteId = null;
                }
                updateSelection(null);
                treeModified();
            }
        };
        $scope.doLayout = function () {
            $scope.drawnRouteId = null;
            onRouteSelectionChanged();
        };
        function isRouteOrNode() {
            return !$scope.selectedFolder;
        }
        $scope.getDeleteTitle = function () {
            if (isRouteOrNode()) {
                return "Delete this route";
            }
            return "Delete this node";
        };
        $scope.getDeleteTarget = function () {
            if (isRouteOrNode()) {
                return "Route";
            }
            return "Node";
        };
        $scope.isFormDirty = function () {
            Wiki.log.debug("endpointForm: ", $scope.endpointForm);
            if ($scope.endpointForm.$dirty) {
                return true;
            }
            if (!$scope.forms['formEditor']) {
                return false;
            }
            else {
                return $scope.forms['formEditor']['$dirty'];
            }
        };
        /* TODO
         $scope.resetForms = () => {
    
         }
         */
        /*
         * Converts a path and a set of endpoint parameters into a URI we can then use to store in the XML
         */
        function createEndpointURI(endpointScheme, slashesText, endpointPath, endpointParameters) {
            console.log("scheme " + endpointScheme + " path " + endpointPath + " parameters " + endpointParameters);
            // now lets create the new URI from the path and parameters
            // TODO should we use JMX for this?
            var uri = ((endpointScheme) ? endpointScheme + ":" + slashesText : "") + (endpointPath ? endpointPath : "");
            var paramText = Core.hashToString(endpointParameters);
            if (paramText) {
                uri += "?" + paramText;
            }
            return uri;
        }
        $scope.updateProperties = function () {
            Wiki.log.info("old URI is " + $scope.nodeData.uri);
            var uri = createEndpointURI($scope.endpointScheme, ($scope.endpointPathHasSlashes ? "//" : ""), $scope.endpointPath, $scope.endpointParameters);
            Wiki.log.info("new URI is " + uri);
            if (uri) {
                $scope.nodeData.uri = uri;
            }
            var key = null;
            var selectedFolder = $scope.selectedFolder;
            if (selectedFolder) {
                key = selectedFolder.key;
                // lets delete the current selected node's div so its updated with the new template values
                var elements = $element.find(".canvas").find("[id='" + key + "']").first().remove();
            }
            treeModified();
            if (key) {
                updateSelection(key);
            }
            if ($scope.isFormDirty()) {
                $scope.endpointForm.$setPristine();
                if ($scope.forms['formEditor']) {
                    $scope.forms['formEditor'].$setPristine();
                }
            }
            Core.$apply($scope);
        };
        $scope.save = function () {
            // generate the new XML
            if ($scope.rootFolder) {
                var xmlNode = Camel.generateXmlFromFolder($scope.rootFolder);
                if (xmlNode) {
                    var text = Core.xmlNodeToString(xmlNode);
                    if (text) {
                        var decoded = decodeURIComponent(text);
                        Wiki.log.debug("Saving xml decoded: " + decoded);
                        // lets save the file...
                        var commitMessage = $scope.commitMessage || "Updated page " + $scope.pageId;
                        wikiRepository.putPage($scope.branch, $scope.pageId, decoded, commitMessage, function (status) {
                            Wiki.onComplete(status);
                            Core.notification("success", "Saved " + $scope.pageId);
                            $scope.modified = false;
                            goToView();
                            Core.$apply($scope);
                        });
                    }
                }
            }
        };
        $scope.cancel = function () {
            console.log("cancelling...");
            // TODO show dialog if folks are about to lose changes...
        };
        $scope.$watch("selectedRouteId", onRouteSelectionChanged);
        function goToView() {
            // TODO lets navigate to the view if we have a separate view one day :)
            /*
             if ($scope.breadcrumbs && $scope.breadcrumbs.length > 1) {
             var viewLink = $scope.breadcrumbs[$scope.breadcrumbs.length - 2];
             console.log("goToView has found view " + viewLink);
             var path = Core.trimLeading(viewLink, "#");
             $location.path(path);
             } else {
             console.log("goToView has no breadcrumbs!");
             }
             */
        }
        function addNewNode(nodeModel) {
            var doc = $scope.doc || document;
            var parentFolder = $scope.selectedFolder || $scope.rootFolder;
            var key = nodeModel["_id"];
            if (!key) {
                console.log("WARNING: no id for model " + JSON.stringify(nodeModel));
            }
            else {
                var treeNode = $scope.selectedFolder;
                if (key === "route") {
                    // lets add to the root of the tree
                    treeNode = $scope.rootFolder;
                }
                else {
                    if (!treeNode) {
                        // lets select the last route - and create a new route if need be
                        var root = $scope.rootFolder;
                        var children = root.children;
                        if (!children || !children.length) {
                            addNewNode(Camel.getCamelSchema("route"));
                            children = root.children;
                        }
                        if (children && children.length) {
                            treeNode = getRouteFolder($scope.rootFolder, $scope.selectedRouteId) || children[children.length - 1];
                        }
                        else {
                            console.log("Could not add a new route to the empty tree!");
                            return;
                        }
                    }
                    // if the parent folder likes to act as a pipeline, then add
                    // after the parent, rather than as a child
                    var parentTypeName = Camel.getFolderCamelNodeId(treeNode);
                    if (!Camel.acceptOutput(parentTypeName)) {
                        treeNode = treeNode.parent || treeNode;
                    }
                }
                if (treeNode) {
                    var node = doc.createElement(key);
                    parentFolder = treeNode;
                    var addedNode = Camel.addRouteChild(parentFolder, node);
                    // TODO add the schema here for an element??
                    // or default the data or something
                    var nodeData = {};
                    if (key === "endpoint" && $scope.endpointConfig) {
                        var key = $scope.endpointConfig.key;
                        if (key) {
                            nodeData["uri"] = key + ":";
                        }
                    }
                    addedNode["camelNodeData"] = nodeData;
                    addedNode["endpointConfig"] = $scope.endpointConfig;
                    if (key === "route") {
                        // lets generate a new routeId and switch to it
                        var count = $scope.routeIds.length;
                        var nodeId = null;
                        while (true) {
                            nodeId = "route" + (++count);
                            if (!$scope.routeIds.find(nodeId)) {
                                break;
                            }
                        }
                        addedNode["routeXmlNode"].setAttribute("id", nodeId);
                        $scope.selectedRouteId = nodeId;
                    }
                }
            }
            treeModified();
        }
        function treeModified(reposition) {
            if (reposition === void 0) { reposition = true; }
            // lets recreate the XML model from the update Folder tree
            var newDoc = Camel.generateXmlFromFolder($scope.rootFolder);
            var tree = Camel.loadCamelTree(newDoc, $scope.pageId);
            if (tree) {
                $scope.rootFolder = tree;
                $scope.doc = Core.pathGet(tree, ["xmlDocument"]);
            }
            $scope.modified = true;
            reloadRouteIds();
            $scope.doLayout();
            Core.$apply($scope);
        }
        function reloadRouteIds() {
            $scope.routeIds = [];
            var doc = $($scope.doc);
            $scope.camelSelectionDetails.selectedCamelContextId = doc.find("camelContext").attr("id");
            doc.find("route").each(function (idx, route) {
                var id = route.getAttribute("id");
                if (id) {
                    $scope.routeIds.push(id);
                }
            });
        }
        function onRouteSelectionChanged() {
            if ($scope.doc) {
                if (!$scope.selectedRouteId && $scope.routeIds && $scope.routeIds.length) {
                    $scope.selectedRouteId = $scope.routeIds[0];
                }
                if ($scope.selectedRouteId && $scope.selectedRouteId !== $scope.drawnRouteId) {
                    var nodes = [];
                    var links = [];
                    Camel.loadRouteXmlNodes($scope, $scope.doc, $scope.selectedRouteId, nodes, links, getWidth());
                    updateSelection($scope.selectedRouteId);
                    // now we've got cid values in the tree and DOM, lets create an index so we can bind the DOM to the tree model
                    $scope.folders = Camel.addFoldersToIndex($scope.rootFolder);
                    showGraph(nodes, links);
                    $scope.drawnRouteId = $scope.selectedRouteId;
                }
                $scope.camelSelectionDetails.selectedRouteId = $scope.selectedRouteId;
            }
        }
        function showGraph(nodes, links) {
            layoutGraph(nodes, links);
        }
        function getNodeId(node) {
            if (angular.isNumber(node)) {
                var idx = node;
                node = $scope.nodeStates[idx];
                if (!node) {
                    console.log("Cant find node at " + idx);
                    return "node-" + idx;
                }
            }
            return node.cid || "node-" + node.id;
        }
        function getSelectedOrRouteFolder() {
            return $scope.selectedFolder || getRouteFolder($scope.rootFolder, $scope.selectedRouteId);
        }
        function getContainerElement() {
            var rootElement = $element;
            var containerElement = rootElement.find(".canvas");
            if (!containerElement || !containerElement.length)
                containerElement = rootElement;
            return containerElement;
        }
        // configure canvas layout and styles
        var endpointStyle = ["Dot", { radius: 4, cssClass: 'camel-canvas-endpoint' }];
        var hoverPaintStyle = { strokeStyle: "red", lineWidth: 3 };
        //var labelStyles: any[] = [ "Label", { label:"FOO", id:"label" }];
        var labelStyles = ["Label"];
        var arrowStyles = ["Arrow", {
            location: 1,
            id: "arrow",
            length: 8,
            width: 8,
            foldback: 0.8
        }];
        var connectorStyle = ["StateMachine", { curviness: 10, proximityLimit: 50 }];
        jsPlumbInstance.importDefaults({
            Endpoint: endpointStyle,
            HoverPaintStyle: hoverPaintStyle,
            ConnectionOverlays: [
                arrowStyles,
                labelStyles
            ]
        });
        $scope.$on('$destroy', function () {
            jsPlumbInstance.reset();
            delete jsPlumbInstance;
        });
        // double click on any connection
        jsPlumbInstance.bind("dblclick", function (connection, originalEvent) {
            if (jsPlumbInstance.isSuspendDrawing()) {
                return;
            }
            alert("double click on connection from " + connection.sourceId + " to " + connection.targetId);
        });
        jsPlumbInstance.bind('connection', function (info, evt) {
            //log.debug("Connection event: ", info);
            Wiki.log.debug("Creating connection from ", info.sourceId, " to ", info.targetId);
            var link = getLink(info);
            var source = $scope.nodes[link.source];
            var sourceFolder = $scope.folders[link.source];
            var targetFolder = $scope.folders[link.target];
            if (Camel.isNextSiblingAddedAsChild(source.type)) {
                sourceFolder.moveChild(targetFolder);
            }
            else {
                sourceFolder.parent.insertAfter(targetFolder, sourceFolder);
            }
            treeModified();
        });
        // lets delete connections on click
        jsPlumbInstance.bind("click", function (c) {
            if (jsPlumbInstance.isSuspendDrawing()) {
                return;
            }
            jsPlumbInstance.detach(c);
        });
        function layoutGraph(nodes, links) {
            var transitions = [];
            var states = Core.createGraphStates(nodes, links, transitions);
            Wiki.log.debug("links: ", links);
            Wiki.log.debug("transitions: ", transitions);
            $scope.nodeStates = states;
            var containerElement = getContainerElement();
            jsPlumbInstance.doWhileSuspended(function () {
                //set our container to some arbitrary initial size
                containerElement.css({
                    'width': '800px',
                    'height': '800px',
                    'min-height': '800px',
                    'min-width': '800px'
                });
                var containerHeight = 0;
                var containerWidth = 0;
                containerElement.find('div.component').each(function (i, el) {
                    Wiki.log.debug("Checking: ", el, " ", i);
                    if (!states.any(function (node) {
                        return el.id === getNodeId(node);
                    })) {
                        Wiki.log.debug("Removing element: ", el.id);
                        jsPlumbInstance.remove(el);
                    }
                });
                angular.forEach(states, function (node) {
                    Wiki.log.debug("node: ", node);
                    var id = getNodeId(node);
                    var div = containerElement.find('#' + id);
                    if (!div[0]) {
                        div = $($scope.nodeTemplate({
                            id: id,
                            node: node
                        }));
                        div.appendTo(containerElement);
                    }
                    // Make the node a jsplumb source
                    jsPlumbInstance.makeSource(div, {
                        filter: "img.nodeIcon",
                        anchor: "Continuous",
                        connector: connectorStyle,
                        connectorStyle: { strokeStyle: "#666", lineWidth: 3 },
                        maxConnections: -1
                    });
                    // and also a jsplumb target
                    jsPlumbInstance.makeTarget(div, {
                        dropOptions: { hoverClass: "dragHover" },
                        anchor: "Continuous"
                    });
                    jsPlumbInstance.draggable(div, {
                        containment: '.camel-canvas'
                    });
                    // add event handlers to this node
                    div.click(function () {
                        var newFlag = !div.hasClass("selected");
                        containerElement.find('div.component').toggleClass("selected", false);
                        div.toggleClass("selected", newFlag);
                        var id = div.attr("id");
                        updateSelection(newFlag ? id : null);
                        Core.$apply($scope);
                    });
                    div.dblclick(function () {
                        var id = div.attr("id");
                        updateSelection(id);
                        //$scope.propertiesDialog.open();
                        Core.$apply($scope);
                    });
                    var height = div.height();
                    var width = div.width();
                    if (height || width) {
                        node.width = width;
                        node.height = height;
                        div.css({
                            'min-width': width,
                            'min-height': height
                        });
                    }
                });
                var edgeSep = 10;
                // Create the layout and get the buildGraph
                dagre.layout().nodeSep(100).edgeSep(edgeSep).rankSep(75).nodes(states).edges(transitions).debugLevel(1).run();
                angular.forEach(states, function (node) {
                    // position the node in the graph
                    var id = getNodeId(node);
                    var div = $("#" + id);
                    var divHeight = div.height();
                    var divWidth = div.width();
                    var leftOffset = node.dagre.x + divWidth;
                    var bottomOffset = node.dagre.y + divHeight;
                    if (containerHeight < bottomOffset) {
                        containerHeight = bottomOffset + edgeSep * 2;
                    }
                    if (containerWidth < leftOffset) {
                        containerWidth = leftOffset + edgeSep * 2;
                    }
                    div.css({ top: node.dagre.y, left: node.dagre.x });
                });
                // size the container to fit the graph
                containerElement.css({
                    'width': containerWidth,
                    'height': containerHeight,
                    'min-height': containerHeight,
                    'min-width': containerWidth
                });
                containerElement.dblclick(function () {
                    $scope.propertiesDialog.open();
                });
                jsPlumbInstance.setSuspendEvents(true);
                // Detach all the current connections and reconnect everything based on the updated graph
                jsPlumbInstance.detachEveryConnection({ fireEvent: false });
                angular.forEach(links, function (link) {
                    jsPlumbInstance.connect({
                        source: getNodeId(link.source),
                        target: getNodeId(link.target)
                    });
                });
                jsPlumbInstance.setSuspendEvents(false);
            });
            return states;
        }
        function getLink(info) {
            var sourceId = info.sourceId;
            var targetId = info.targetId;
            return {
                source: sourceId,
                target: targetId
            };
        }
        function getNodeByCID(nodes, cid) {
            return nodes.find(function (node) {
                return node.cid === cid;
            });
        }
        /*
         * Updates the selection with the given folder or ID
         */
        function updateSelection(folderOrId) {
            var folder = null;
            if (angular.isString(folderOrId)) {
                var id = folderOrId;
                folder = (id && $scope.folders) ? $scope.folders[id] : null;
            }
            else {
                folder = folderOrId;
            }
            $scope.selectedFolder = folder;
            folder = getSelectedOrRouteFolder();
            $scope.nodeXmlNode = null;
            $scope.propertiesTemplate = null;
            if (folder) {
                var nodeName = Camel.getFolderCamelNodeId(folder);
                $scope.nodeData = Camel.getRouteFolderJSON(folder);
                $scope.nodeDataChangedFields = {};
                $scope.nodeModel = Camel.getCamelSchema(nodeName);
                if ($scope.nodeModel) {
                    $scope.propertiesTemplate = "app/wiki/html/camelPropertiesEdit.html";
                }
                $scope.selectedEndpoint = null;
                if ("endpoint" === nodeName) {
                    var uri = $scope.nodeData["uri"];
                    if (uri) {
                        // lets decompose the URI into scheme, path and parameters
                        var idx = uri.indexOf(":");
                        if (idx > 0) {
                            var endpointScheme = uri.substring(0, idx);
                            var endpointPath = uri.substring(idx + 1);
                            // for empty paths lets assume we need // on a URI
                            $scope.endpointPathHasSlashes = endpointPath ? false : true;
                            if (endpointPath.startsWith("//")) {
                                endpointPath = endpointPath.substring(2);
                                $scope.endpointPathHasSlashes = true;
                            }
                            idx = endpointPath.indexOf("?");
                            var endpointParameters = {};
                            if (idx > 0) {
                                var parameters = endpointPath.substring(idx + 1);
                                endpointPath = endpointPath.substring(0, idx);
                                endpointParameters = Core.stringToHash(parameters);
                            }
                            $scope.endpointScheme = endpointScheme;
                            $scope.endpointPath = endpointPath;
                            $scope.endpointParameters = endpointParameters;
                            console.log("endpoint " + endpointScheme + " path " + endpointPath + " and parameters " + JSON.stringify(endpointParameters));
                            $scope.loadEndpointSchema(endpointScheme);
                            $scope.selectedEndpoint = {
                                endpointScheme: endpointScheme,
                                endpointPath: endpointPath,
                                parameters: endpointParameters
                            };
                        }
                    }
                }
            }
        }
        function getWidth() {
            var canvasDiv = $($element);
            return canvasDiv.width();
        }
        function getFolderIdAttribute(route) {
            var id = null;
            if (route) {
                var xmlNode = route["routeXmlNode"];
                if (xmlNode) {
                    id = xmlNode.getAttribute("id");
                }
            }
            return id;
        }
        function getRouteFolder(tree, routeId) {
            var answer = null;
            if (tree) {
                angular.forEach(tree.children, function (route) {
                    if (!answer) {
                        var id = getFolderIdAttribute(route);
                        if (routeId === id) {
                            answer = route;
                        }
                    }
                });
            }
            return answer;
        }
    }]);
})(Wiki || (Wiki = {}));

/// <reference path="../../includes.ts"/>
/// <reference path="../../git/ts/gitHelpers.ts"/>
/// <reference path="wikiHelpers.ts"/>
/**
 * @module Wiki
 */
var Wiki;
(function (Wiki) {
    Wiki._module.controller("Wiki.CommitController", ["$scope", "$location", "$routeParams", "$templateCache", "workspace", "marked", "fileExtensionTypeRegistry", "wikiRepository", "jolokia", function ($scope, $location, $routeParams, $templateCache, workspace, marked, fileExtensionTypeRegistry, wikiRepository, jolokia) {
        var isFmc = Wiki.isFMCContainer(workspace);
        Wiki.initScope($scope, $routeParams, $location);
        $scope.commitId = $scope.objectId;
        $scope.selectedItems = [];
        // TODO we could configure this?
        $scope.dateFormat = 'EEE, MMM d, y : hh:mm:ss a';
        $scope.gridOptions = {
            data: 'commits',
            showFilter: false,
            multiSelect: false,
            selectWithCheckboxOnly: true,
            showSelectionCheckbox: true,
            displaySelectionCheckbox: true,
            selectedItems: $scope.selectedItems,
            filterOptions: {
                filterText: ''
            },
            columnDefs: [
                {
                    field: 'path',
                    displayName: 'File Name',
                    cellTemplate: $templateCache.get('fileCellTemplate.html'),
                    width: "***",
                    cellFilter: ""
                },
            ]
        };
        $scope.$on("$routeChangeSuccess", function (event, current, previous) {
            // lets do this asynchronously to avoid Error: $digest already in progress
            setTimeout(updateView, 50);
        });
        $scope.$watch('workspace.tree', function () {
            if (!$scope.git && Git.getGitMBean(workspace)) {
                // lets do this asynchronously to avoid Error: $digest already in progress
                //console.log("Reloading the view as we now seem to have a git mbean!");
                setTimeout(updateView, 50);
            }
        });
        $scope.canRevert = function () {
            return $scope.selectedItems.length === 1;
        };
        $scope.revert = function () {
            if ($scope.selectedItems.length > 0) {
                var path = commitPath($scope.selectedItems[0]);
                var objectId = $scope.commitId;
                if (path && objectId) {
                    var commitMessage = "Reverting file " + $scope.pageId + " to previous version " + objectId;
                    wikiRepository.revertTo($scope.branch, objectId, $scope.pageId, commitMessage, function (result) {
                        Wiki.onComplete(result);
                        // now lets update the view
                        updateView();
                    });
                }
            }
        };
        function commitPath(commit) {
            return commit.path || commit.name;
        }
        $scope.diff = function () {
            if ($scope.selectedItems.length > 0) {
                var commit = $scope.selectedItems[0];
                /*
                 var commit = row;
                 var entity = row.entity;
                 if (entity) {
                 commit = entity;
                 }
                 */
                var link = Wiki.startLink($scope.branch) + "/diff/" + commitPath(commit) + "/" + $scope.commitId + "/";
                var path = Core.trimLeading(link, "#");
                $location.path(path);
            }
        };
        updateView();
        function updateView() {
            var commitId = $scope.commitId;
            Wiki.loadBranches(jolokia, wikiRepository, $scope, isFmc);
            wikiRepository.commitInfo(commitId, function (commitInfo) {
                $scope.commitInfo = commitInfo;
                Core.$apply($scope);
            });
            wikiRepository.commitTree(commitId, function (commits) {
                $scope.commits = commits;
                angular.forEach(commits, function (commit) {
                    commit.fileIconHtml = Wiki.fileIconHtml(commit);
                    commit.fileClass = commit.name.endsWith(".profile") ? "green" : "";
                    var changeType = commit.changeType;
                    var path = commitPath(commit);
                    if (path) {
                        commit.fileLink = Wiki.startLink($scope.branch) + '/version/' + path + '/' + commitId;
                    }
                    if (changeType) {
                        changeType = changeType.toLowerCase();
                        if (changeType.startsWith("a")) {
                            commit.changeClass = "change-add";
                            commit.change = "add";
                            commit.title = "added";
                        }
                        else if (changeType.startsWith("d")) {
                            commit.changeClass = "change-delete";
                            commit.change = "delete";
                            commit.title = "deleted";
                            commit.fileLink = null;
                        }
                        else {
                            commit.changeClass = "change-modify";
                            commit.change = "modify";
                            commit.title = "modified";
                        }
                        commit.changeTypeHtml = '<span class="' + commit.changeClass + '">' + commit.title + '</span>';
                    }
                });
                Core.$apply($scope);
            });
        }
    }]);
})(Wiki || (Wiki = {}));

/// <reference path="../../includes.ts"/>
/// <reference path="../../git/ts/gitHelpers.ts"/>
/// <reference path="wikiHelpers.ts"/>
var Wiki;
(function (Wiki) {
    var CreateController = Wiki.controller("CreateController", ["$scope", "$location", "$routeParams", "$route", "$http", "$timeout", "workspace", "jolokia", "wikiRepository", function ($scope, $location, $routeParams, $route, $http, $timeout, workspace, jolokia, wikiRepository) {
        var isFmc = Wiki.isFMCContainer(workspace);
        Wiki.initScope($scope, $routeParams, $location);
        $scope.createDocumentTree = Wiki.createWizardTree(workspace, $scope);
        $scope.createDocumentTreeActivations = ["camel-spring.xml", "ReadMe.md"];
        $scope.fileExists = {
            exists: false,
            name: ""
        };
        $scope.newDocumentName = "";
        $scope.selectedCreateDocumentExtension = null;
        $scope.fileExists.exists = false;
        $scope.fileExists.name = "";
        $scope.newDocumentName = "";
        function returnToDirectory() {
            var link = Wiki.viewLink($scope.branch, $scope.pageId, $location);
            Wiki.log.debug("Cancelling, going to link: ", link);
            Wiki.goToLink(link, $timeout, $location);
        }
        $scope.cancel = function () {
            returnToDirectory();
        };
        $scope.onCreateDocumentSelect = function (node) {
            // reset as we switch between document types
            $scope.fileExists.exists = false;
            $scope.fileExists.name = "";
            var entity = node ? node.entity : null;
            $scope.selectedCreateDocumentTemplate = entity;
            $scope.selectedCreateDocumentTemplateRegex = $scope.selectedCreateDocumentTemplate.regex || /.*/;
            $scope.selectedCreateDocumentTemplateInvalid = $scope.selectedCreateDocumentTemplate.invalid || "invalid name";
            $scope.selectedCreateDocumentTemplateExtension = $scope.selectedCreateDocumentTemplate.extension || null;
            Wiki.log.debug("Entity: ", entity);
            if (entity) {
                if (entity.generated) {
                    $scope.formSchema = entity.generated.schema;
                    $scope.formData = entity.generated.form(workspace, $scope);
                }
                else {
                    $scope.formSchema = {};
                    $scope.formData = {};
                }
                Core.$apply($scope);
            }
        };
        $scope.addAndCloseDialog = function (fileName) {
            $scope.newDocumentName = fileName;
            var template = $scope.selectedCreateDocumentTemplate;
            var path = getNewDocumentPath();
            // clear $scope.newDocumentName so we dont remember it when we open it next time
            $scope.newDocumentName = null;
            // reset before we check just in a bit
            $scope.fileExists.exists = false;
            $scope.fileExists.name = "";
            $scope.fileExtensionInvalid = null;
            if (!template || !path) {
                return;
            }
            // validate if the name match the extension
            if ($scope.selectedCreateDocumentTemplateExtension) {
                var idx = path.lastIndexOf('.');
                if (idx > 0) {
                    var ext = path.substring(idx);
                    if ($scope.selectedCreateDocumentTemplateExtension !== ext) {
                        $scope.fileExtensionInvalid = "File extension must be: " + $scope.selectedCreateDocumentTemplateExtension;
                        Core.$apply($scope);
                        return;
                    }
                }
            }
            // validate if the file exists, and use the synchronous call
            var exists = wikiRepository.exists($scope.branch, path, null);
            if (exists) {
                $scope.fileExists.exists = true;
                $scope.fileExists.name = path;
                Core.$apply($scope);
                return;
            }
            var name = Wiki.fileName(path);
            var folder = Wiki.fileParent(path);
            var exemplar = template.exemplar;
            var commitMessage = "Created " + template.label;
            var exemplarUri = Core.url("/app/wiki/exemplar/" + exemplar);
            if (template.folder) {
                Core.notification("success", "Creating new folder " + name);
                wikiRepository.createDirectory($scope.branch, path, commitMessage, function (status) {
                    var link = Wiki.viewLink($scope.branch, path, $location);
                    Wiki.goToLink(link, $timeout, $location);
                });
            }
            else if (template.profile) {
                function toPath(profileName) {
                    var answer = "fabric/profiles/" + profileName;
                    answer = answer.replace(/-/g, "/");
                    answer = answer + ".profile";
                    return answer;
                }
                function toProfileName(path) {
                    var answer = path.replace(/^fabric\/profiles\//, "");
                    answer = answer.replace(/\//g, "-");
                    answer = answer.replace(/\.profile$/, "");
                    return answer;
                }
                // strip off any profile name in case the user creates a profile while looking at
                // another profile
                folder = folder.replace(/\/=?(\w*)\.profile$/, "");
                var concatenated = folder + "/" + name;
                var profileName = toProfileName(concatenated);
                var targetPath = toPath(profileName);
                // check if profile exists
                var profile = Fabric.getProfile(workspace.jolokia, $scope.branch, profileName, false);
                if (profile) {
                    $scope.fileExists.exists = true;
                    $scope.fileExists.name = profileName;
                    Core.$apply($scope);
                    return;
                }
                Fabric.createProfile(workspace.jolokia, $scope.branch, profileName, ['default'], function () {
                    // notification('success', 'Created profile ' + profileName);
                    Core.$apply($scope);
                    Fabric.newConfigFile(workspace.jolokia, $scope.branch, profileName, 'ReadMe.md', function () {
                        // notification('info', 'Created empty Readme.md in profile ' + profileName);
                        Core.$apply($scope);
                        var contents = "Here's an empty ReadMe.md for '" + profileName + "', please update!";
                        Fabric.saveConfigFile(workspace.jolokia, $scope.branch, profileName, 'ReadMe.md', contents.encodeBase64(), function () {
                            // notification('info', 'Updated Readme.md in profile ' + profileName);
                            Core.$apply($scope);
                            var link = Wiki.viewLink($scope.branch, targetPath, $location);
                            Wiki.goToLink(link, $timeout, $location);
                        }, function (response) {
                            Core.notification('error', 'Failed to set ReadMe.md data in profile ' + profileName + ' due to ' + response.error);
                            Core.$apply($scope);
                        });
                    }, function (response) {
                        Core.notification('error', 'Failed to create ReadMe.md in profile ' + profileName + ' due to ' + response.error);
                        Core.$apply($scope);
                    });
                }, function (response) {
                    Core.notification('error', 'Failed to create profile ' + profileName + ' due to ' + response.error);
                    Core.$apply($scope);
                });
            }
            else if (template.generated) {
                var options = {
                    workspace: workspace,
                    form: $scope.formData,
                    name: fileName,
                    parentId: folder,
                    branch: $scope.branch,
                    success: function (contents) {
                        if (contents) {
                            wikiRepository.putPageBase64($scope.branch, path, contents, commitMessage, function (status) {
                                Wiki.log.debug("Created file " + name);
                                Wiki.onComplete(status);
                                returnToDirectory();
                            });
                        }
                        else {
                            returnToDirectory();
                        }
                    },
                    error: function (error) {
                        Core.notification('error', error);
                        Core.$apply($scope);
                    }
                };
                template.generated.generate(options);
            }
            else {
                // load the example data (if any) and then add the document to git and change the link to the new document
                $http.get(exemplarUri).success(function (data, status, headers, config) {
                    putPage(path, name, folder, data, commitMessage);
                }).error(function (data, status, headers, config) {
                    // create an empty file
                    putPage(path, name, folder, "", commitMessage);
                });
            }
        };
        function putPage(path, name, folder, contents, commitMessage) {
            // TODO lets check this page does not exist - if it does lets keep adding a new post fix...
            wikiRepository.putPage($scope.branch, path, contents, commitMessage, function (status) {
                Wiki.log.debug("Created file " + name);
                Wiki.onComplete(status);
                // lets navigate to the edit link
                // load the directory and find the child item
                $scope.git = wikiRepository.getPage($scope.branch, folder, $scope.objectId, function (details) {
                    // lets find the child entry so we can calculate its correct edit link
                    var link = null;
                    if (details && details.children) {
                        Wiki.log.debug("scanned the directory " + details.children.length + " children");
                        var child = details.children.find(function (c) { return c.name === Wiki.fileName; });
                        if (child) {
                            link = $scope.childLink(child);
                        }
                        else {
                            Wiki.log.debug("Could not find name '" + Wiki.fileName + "' in the list of file names " + JSON.stringify(details.children.map(function (c) { return c.name; })));
                        }
                    }
                    if (!link) {
                        Wiki.log.debug("WARNING: could not find the childLink so reverting to the wiki edit page!");
                        link = Wiki.editLink($scope.branch, path, $location);
                    }
                    //Core.$apply($scope);
                    Wiki.goToLink(link, $timeout, $location);
                });
            });
        }
        function getNewDocumentPath() {
            var template = $scope.selectedCreateDocumentTemplate;
            if (!template) {
                Wiki.log.debug("No template selected.");
                return null;
            }
            var exemplar = template.exemplar || "";
            var name = $scope.newDocumentName || exemplar;
            if (name.indexOf('.') < 0) {
                // lets add the file extension from the exemplar
                var idx = exemplar.lastIndexOf(".");
                if (idx > 0) {
                    name += exemplar.substring(idx);
                }
            }
            // lets deal with directories in the name
            var folder = $scope.pageId;
            if ($scope.isFile) {
                // if we are a file lets discard the last part of the path
                var idx = folder.lastIndexOf("/");
                if (idx <= 0) {
                    folder = "";
                }
                else {
                    folder = folder.substring(0, idx);
                }
            }
            var idx = name.lastIndexOf("/");
            if (idx > 0) {
                folder += "/" + name.substring(0, idx);
                name = name.substring(idx + 1);
            }
            folder = Core.trimLeading(folder, "/");
            return folder + (folder ? "/" : "") + name;
        }
    }]);
})(Wiki || (Wiki = {}));

/// <reference path="../../includes.ts"/>
/// <reference path="../../git/ts/gitHelpers.ts"/>
/// <reference path="wikiHelpers.ts"/>
/**
 * @module Wiki
 */
var Wiki;
(function (Wiki) {
    Wiki._module.controller("Wiki.DozerMappingsController", ["$scope", "$location", "$routeParams", "workspace", "jolokia", "wikiRepository", "$templateCache", function ($scope, $location, $routeParams, workspace, jolokia, wikiRepository, $templateCache) {
        var log = Logger.get("Dozer");
        Wiki.initScope($scope, $routeParams, $location);
        Dozer.schemaConfigure();
        $scope.profileId = Fabric.pagePathToProfileId($scope.pageId);
        $scope.versionId = $scope.branch || "1.0";
        $scope.schema = {};
        $scope.addDialog = new UI.Dialog();
        $scope.propertiesDialog = new UI.Dialog();
        $scope.deleteDialog = false;
        $scope.unmappedFieldsHasValid = false;
        $scope.modified = false;
        $scope.selectedItems = [];
        $scope.mappings = [];
        $scope.schemas = [];
        $scope.aName = '';
        $scope.bName = '';
        $scope.connectorStyle = ["Bezier"];
        $scope.main = "";
        $scope.tab = "Mappings";
        $scope.gridOptions = {
            selectedItems: $scope.selectedItems,
            data: 'mappings',
            displayFooter: false,
            showFilter: false,
            //sortInfo: { field: 'timestamp', direction: 'DESC'},
            filterOptions: {
                filterText: "searchText"
            },
            columnDefs: [
                {
                    field: 'class_a',
                    displayName: 'From',
                    cellTemplate: '<div class="ngCellText">{{row.entity.class_a.name}}</div>'
                },
                {
                    field: 'class_b',
                    displayName: 'To',
                    cellTemplate: '<div class="ngCellText">{{row.entity.class_b.name}}</div>'
                }
            ]
        };
        if ($scope.profileId) {
            Fabric.profileJolokia(jolokia, $scope.profileId, $scope.versionId, function (containerJolokia) {
                $scope.containerJolokia = containerJolokia;
                $scope.missingContainer = !containerJolokia ? true : false;
            });
        }
        $scope.$on("$routeChangeSuccess", function (event, current, previous) {
            // lets do this asynchronously to avoid Error: $digest already in progress
            setTimeout(updateView, 50);
        });
        $scope.triggerRefresh = function (timeout) {
            if (timeout === void 0) { timeout = 500; }
            $scope.main = "";
            setTimeout(function () {
                $scope.main = $templateCache.get("pageTemplate.html");
                Core.$apply($scope);
            }, timeout);
        };
        $scope.disableReload = function () {
            var aValue = Core.pathGet($scope, ["selectedMapping", "class_a", "value"]);
            var bValue = Core.pathGet($scope, ["selectedMapping", "class_b", "value"]);
            return aValue === $scope.aName && bValue === $scope.bName;
        };
        $scope.doReload = function () {
            $scope.selectedMapping.class_a.value = $scope.aName;
            $scope.selectedMapping.class_b.value = $scope.bName;
            $scope.triggerRefresh();
        };
        $scope.$watch('selectedMapping', function (newValue, oldValue) {
            if (newValue !== oldValue) {
                $scope.aName = newValue.class_a.value;
                $scope.bName = newValue.class_b.value;
                $scope.triggerRefresh();
            }
        });
        $scope.$watch('selectedMapping.class_a.value', function (newValue, oldValue) {
            if (newValue !== oldValue && newValue !== '') {
                $scope.fetchProperties(newValue, $scope.selectedMapping.class_a, 'Right');
            }
        });
        $scope.$watch('selectedMapping.class_b.value', function (newValue, oldValue) {
            if (newValue !== oldValue && newValue !== '') {
                $scope.fetchProperties(newValue, $scope.selectedMapping.class_b, 'Left');
            }
        });
        $scope.fetchProperties = function (className, target, anchor) {
            var introspectorMBean = Dozer.getIntrospectorMBean(workspace);
            if (introspectorMBean && !$scope.missingContainer) {
                var aJolokia = $scope.containerJolokia || jolokia;
                aJolokia.request({
                    type: 'exec',
                    mbean: introspectorMBean,
                    operation: 'getProperties(java.lang.String)',
                    arguments: [className]
                }, {
                    success: function (response) {
                        target.error = null;
                        target.properties = response.value;
                        var parentId = '';
                        if (angular.isDefined(target.value)) {
                            parentId = target.value;
                        }
                        else {
                            parentId = target.path;
                        }
                        angular.forEach(target.properties, function (property) {
                            property.id = Core.getUUID();
                            property.path = parentId + '/' + property.displayName;
                            property.anchor = anchor;
                            // TODO - Let's see if we need to do this...
                            /*
                             var lookup = !Dozer.excludedPackages.any((excluded) => { return property.typeName.has(excluded); });
                             if (lookup) {
                             $scope.fetchProperties(property.typeName, property, anchor);
                             }
                             */
                        });
                        Core.$apply($scope);
                    },
                    error: function (response) {
                        target.properties = null;
                        target.error = {
                            'type': response.error_type,
                            'stackTrace': response.error
                        };
                        log.error("got: " + response);
                        Core.$apply($scope);
                    }
                });
            }
        };
        $scope.getSourceAndTarget = function (info) {
            var sourcePath = info.source.attr('field-path');
            var targetPath = info.target.attr('field-path');
            var sourceField = sourcePath.split('/').last();
            var targetField = sourcePath.split('/').last();
            return {
                from: sourceField,
                to: targetField
            };
        };
        function extractProperty(clazz, prop) {
            return (!clazz || !clazz.properties) ? null : clazz.properties.find(function (property) {
                return property.path.endsWith('/' + prop);
            });
        }
        // The jsPlumb directive will call this after it's done it's thing...
        function addConnectionClickHandler(connection, jsplumb) {
            connection.bind('click', function (connection) {
                jsplumb.detach(connection);
            });
        }
        function getPaintStyle() {
            return {
                strokeStyle: UI.colors.sample(),
                lineWidth: 4
            };
        }
        $scope.jsPlumbCallback = function (jsplumb, nodes, nodesById, connections) {
            // Set up any connections loaded from the XML
            // TODO - currently we actually are only looking at the top-level properties
            angular.forEach($scope.selectedMapping.fields, function (field) {
                var a_property = extractProperty($scope.selectedMapping.class_a, field.a.value);
                var b_property = extractProperty($scope.selectedMapping.class_b, field.b.value);
                if (a_property && b_property) {
                    var a_node = nodesById[a_property.id];
                    var b_node = nodesById[b_property.id];
                    var connection = $scope.jsPlumb.connect({
                        source: a_node.el,
                        target: b_node.el
                    }, {
                        connector: $scope.connectorStyle,
                        maxConnections: 1,
                        paintStyle: getPaintStyle()
                    });
                    //Ensure loaded connections can also be removed
                    addConnectionClickHandler(connection, jsplumb);
                    a_node.connections.push(connection);
                    b_node.connections.push(connection);
                }
            });
            // Handle new connection events...
            jsplumb.bind('connection', function (info) {
                // Add a handler so we can click on a connection to make it go away
                addConnectionClickHandler(info.connection, jsplumb);
                info.connection.setPaintStyle(getPaintStyle());
                var newMapping = $scope.getSourceAndTarget(info);
                var field = new Dozer.Field(new Dozer.FieldDefinition(newMapping.from), new Dozer.FieldDefinition(newMapping.to));
                $scope.selectedMapping.fields.push(field);
                $scope.modified = true;
                Core.$apply($scope);
            });
            // Handle connection detach events...
            jsplumb.bind('connectionDetached', function (info) {
                var toDetach = $scope.getSourceAndTarget(info);
                var field = new Dozer.Field(new Dozer.FieldDefinition(toDetach.from), new Dozer.FieldDefinition(toDetach.to));
                $scope.selectedMapping.fields.remove(field);
                $scope.modified = true;
                Core.$apply($scope);
            });
        };
        $scope.formatStackTrace = function (exception) {
            return Log.formatStackTrace(exception);
        };
        $scope.addMapping = function () {
            var treeNode = $scope.rootTreeNode;
            if (treeNode) {
                var parentFolder = treeNode.data;
                var mapping = new Dozer.Mapping();
                var addedNode = Dozer.createMappingFolder(mapping, parentFolder);
                var added = treeNode.addChild(addedNode);
                if (added) {
                    added.expand(true);
                    added.select(true);
                    added.activate(true);
                    onTreeModified();
                }
                $scope.mappings.push(mapping);
                $scope.selectedMapping = mapping;
            }
        };
        $scope.addField = function () {
            if ($scope.selectedMapping) {
                // lets find all the possible unmapped fields we can map from...
                Dozer.findUnmappedFields(workspace, $scope.selectedMapping, function (data) {
                    log.warn("has unmapped data fields: " + data);
                    $scope.unmappedFields = data;
                    $scope.unmappedFieldsHasValid = false;
                    $scope.addDialog.open();
                    Core.$apply($scope);
                });
            }
        };
        $scope.addAndCloseDialog = function () {
            log.info("About to add the unmapped fields " + JSON.stringify($scope.unmappedFields, null, "  "));
            if ($scope.selectedMapping) {
                // TODO whats the folder???
                angular.forEach($scope.unmappedFields, function (unmappedField) {
                    if (unmappedField.valid) {
                        // TODO detect exclude!
                        var field = new Dozer.Field(new Dozer.FieldDefinition(unmappedField.fromField), new Dozer.FieldDefinition(unmappedField.toField));
                        $scope.selectedMapping.fields.push(field);
                        var treeNode = $scope.selectedMappingTreeNode;
                        var mappingFolder = $scope.selectedMappingFolder;
                        if (treeNode && mappingFolder) {
                            var fieldFolder = Dozer.addMappingFieldFolder(field, mappingFolder);
                            var added = treeNode.addChild(fieldFolder);
                            if (added) {
                                added.expand(true);
                                added.select(true);
                                added.activate(true);
                                onTreeModified();
                            }
                        }
                        else {
                            log.warn("No treenode and folder for mapping node! treeNode " + treeNode + " mappingFolder " + mappingFolder);
                        }
                    }
                });
            }
            $scope.addDialog.close();
        };
        $scope.canDelete = function () {
            return $scope.selectedFolder ? true : false;
        };
        $scope.removeNode = function () {
            if ($scope.selectedFolder && $scope.treeNode) {
                // TODO deal with deleting fields
                var folder = $scope.selectedFolder;
                var entity = folder.entity;
                if (entity instanceof Dozer.Field) {
                    // lets remove this from the parent mapping
                    var mapping = Core.pathGet(folder, ["parent", "entity"]);
                    if (mapping) {
                        mapping.fields.remove(entity);
                    }
                }
                $scope.selectedFolder.detach();
                $scope.treeNode.remove();
                $scope.selectedFolder = null;
                $scope.treeNode = null;
                onTreeModified();
            }
        };
        $scope.saveMappings = function () {
            $scope.model.mappings = $scope.mappings;
            var text = Dozer.saveToXmlText($scope.model);
            if (text) {
                var commitMessage = $scope.commitMessage || "Updated page " + $scope.pageId;
                wikiRepository.putPage($scope.branch, $scope.pageId, text, commitMessage, function (status) {
                    Wiki.onComplete(status);
                    $scope.modified = false;
                    Core.notification("success", "Saved " + $scope.pageId);
                    goToView();
                    Core.$apply($scope);
                });
            }
        };
        $scope.save = function () {
            if ($scope.tab === "Mappings") {
                $scope.saveMappings();
                return;
            }
            if ($scope.model) {
                // lets copy the mappings from the tree
                var model = Dozer.loadModelFromTree($scope.rootTreeNode, $scope.model);
                var text = Dozer.saveToXmlText(model);
                if (text) {
                    var commitMessage = $scope.commitMessage || "Updated page " + $scope.pageId;
                    wikiRepository.putPage($scope.branch, $scope.pageId, text, commitMessage, function (status) {
                        Wiki.onComplete(status);
                        $scope.modified = false;
                        Core.notification("success", "Saved " + $scope.pageId);
                        goToView();
                        Core.$apply($scope);
                    });
                }
            }
        };
        $scope.cancel = function () {
            log.info("cancelling...");
            // TODO show dialog if folks are about to lose changes...
        };
        $scope.onRootTreeNode = function (rootTreeNode) {
            $scope.rootTreeNode = rootTreeNode;
        };
        $scope.onNodeSelect = function (folder, treeNode) {
            $scope.selectedFolder = folder;
            $scope.treeNode = treeNode;
            $scope.propertiesTemplate = null;
            $scope.dozerEntity = null;
            $scope.selectedDescription = "";
            $scope.selectedMapping = null;
            $scope.selectedMappingTreeNode = null;
            $scope.selectedMappingFolder = null;
            // now the model is bound, lets add a listener
            if ($scope.removeModelChangeListener) {
                $scope.removeModelChangeListener();
                $scope.removeModelChangeListener = null;
            }
            if (folder) {
                var entity = folder.entity;
                $scope.dozerEntity = entity;
                var propertiesTemplate = "app/wiki/html/dozerPropertiesEdit.html";
                if (entity instanceof Dozer.Field) {
                    //var field: Dozer.Field = entity;
                    $scope.propertiesTemplate = propertiesTemplate;
                    $scope.nodeModel = io_hawt_dozer_schema_Field;
                    $scope.selectedDescription = "Field Mapping";
                    $scope.selectedMapping = Core.pathGet(folder, ["parent", "entity"]);
                    $scope.selectedMappingFolder = folder.parent;
                    $scope.selectedMappingTreeNode = treeNode.parent;
                }
                else if (entity instanceof Dozer.Mapping) {
                    //var mapping: Dozer.Mapping = entity;
                    $scope.propertiesTemplate = propertiesTemplate;
                    $scope.nodeModel = io_hawt_dozer_schema_Mapping;
                    $scope.selectedDescription = "Class Mapping";
                    $scope.selectedMapping = entity;
                    $scope.selectedMappingFolder = folder;
                    $scope.selectedMappingTreeNode = treeNode;
                }
                if ($scope.selectedMapping && !$scope.removeModelChangeListener) {
                }
            }
            Core.$apply($scope);
        };
        $scope.onUnmappedFieldChange = function (unmappedField) {
            unmappedField.valid = unmappedField.toField ? true : false;
            $scope.unmappedFieldsHasValid = $scope.unmappedFields.find(function (f) { return f.valid; });
        };
        function findFieldNames(className, text) {
            //console.log("Finding the to field names for expression '" + text + "'  on class " + className);
            var properties = Dozer.findProperties(workspace, className, text, null);
            return properties.map(function (p) { return p.name; });
        }
        $scope.fromFieldNames = function (text) {
            var className = Core.pathGet($scope.selectedMapping, ["class_a", "value"]);
            return findFieldNames(className, text);
        };
        $scope.toFieldNames = function (text) {
            var className = Core.pathGet($scope.selectedMapping, ["class_b", "value"]);
            return findFieldNames(className, text);
        };
        $scope.classNames = function (text) {
            // lets only query if the size is reasonable
            if (!text || text.length < 2)
                return [];
            return Core.time("Time the query of classes", function () {
                log.info("searching for class names with filter '" + text + "'");
                var answer = Dozer.findClassNames(workspace, text);
                log.info("Found results: " + answer.length);
                return answer;
            });
        };
        updateView();
        function updateView() {
            $scope.pageId = Wiki.pageId($routeParams, $location);
            if (Git.getGitMBean(workspace)) {
                $scope.git = wikiRepository.getPage($scope.branch, $scope.pageId, $scope.objectId, onResults);
            }
        }
        function onResults(response) {
            var text = response.text;
            if (text) {
                if ($scope.responseText !== text) {
                    $scope.responseText = text;
                    // lets remove any dodgy characters so we can use it as a DOM id
                    $scope.model = Dozer.loadDozerModel(text, $scope.pageId);
                    $scope.mappings = Core.pathGet($scope.model, ["mappings"]);
                    $scope.mappingTree = Dozer.createDozerTree($scope.model);
                    if (!angular.isDefined($scope.selectedMapping)) {
                        $scope.selectedMapping = $scope.mappings.first();
                    }
                    $scope.main = $templateCache.get("pageTemplate.html");
                }
            }
            else {
                log.warn("No XML found for page " + $scope.pageId);
            }
            Core.$apply($scope);
        }
        function onTreeModified() {
            $scope.modified = true;
        }
        function goToView() {
            // TODO lets navigate to the view if we have a separate view one day :)
            /*
             if ($scope.breadcrumbs && $scope.breadcrumbs.length > 1) {
             var viewLink = $scope.breadcrumbs[$scope.breadcrumbs.length - 2];
             console.log("goToView has found view " + viewLink);
             var path = Core.trimLeading(viewLink, "#");
             $location.path(path);
             } else {
             console.log("goToView has no breadcrumbs!");
             }
             */
        }
    }]);
})(Wiki || (Wiki = {}));

/// <reference path="../../includes.ts"/>
/// <reference path="../../git/ts/gitHelpers.ts"/>
/// <reference path="wikiHelpers.ts"/>
/**
 * @module Wiki
 */
var Wiki;
(function (Wiki) {
    Wiki._module.controller("Wiki.EditController", ["$scope", "$location", "$routeParams", "fileExtensionTypeRegistry", "wikiRepository", function ($scope, $location, $routeParams, fileExtensionTypeRegistry, wikiRepository) {
        Wiki.initScope($scope, $routeParams, $location);
        $scope.entity = {
            source: null
        };
        var format = Wiki.fileFormat($scope.pageId, fileExtensionTypeRegistry);
        var form = null;
        if ((format && format === "javascript") || isCreate()) {
            form = $location.search()["form"];
        }
        var options = {
            mode: {
                name: format
            }
        };
        $scope.codeMirrorOptions = CodeEditor.createEditorSettings(options);
        $scope.modified = false;
        $scope.isValid = function () { return $scope.fileName; };
        $scope.canSave = function () { return !$scope.modified; };
        $scope.$watch('entity.source', function (newValue, oldValue) {
            $scope.modified = newValue && oldValue && newValue !== oldValue;
        }, true);
        Wiki.log.debug("path: ", $scope.path);
        $scope.$watch('modified', function (newValue, oldValue) {
            Wiki.log.debug("modified: ", newValue);
        });
        $scope.viewLink = function () { return Wiki.viewLink($scope.branch, $scope.pageId, $location, $scope.fileName); };
        $scope.cancel = function () {
            goToView();
        };
        $scope.save = function () {
            if ($scope.modified && $scope.fileName) {
                saveTo($scope["pageId"]);
            }
        };
        $scope.create = function () {
            // lets combine the file name with the current pageId (which is the directory)
            var path = $scope.pageId + "/" + $scope.fileName;
            console.log("creating new file at " + path);
            saveTo(path);
        };
        $scope.onSubmit = function (json, form) {
            if (isCreate()) {
                $scope.create();
            }
            else {
                $scope.save();
            }
        };
        $scope.onCancel = function (form) {
            setTimeout(function () {
                goToView();
                Core.$apply($scope);
            }, 50);
        };
        updateView();
        function isCreate() {
            return $location.path().startsWith("/wiki/create");
        }
        function updateView() {
            // only load the source if not in create mode
            if (isCreate()) {
                updateSourceView();
            }
            else {
                Wiki.log.debug("Getting page, branch: ", $scope.branch, " pageId: ", $scope.pageId, " objectId: ", $scope.objectId);
                wikiRepository.getPage($scope.branch, $scope.pageId, $scope.objectId, onFileContents);
            }
        }
        function onFileContents(details) {
            var contents = details.text;
            $scope.entity.source = contents;
            $scope.fileName = $scope.pageId.split('/').last();
            Wiki.log.debug("file name: ", $scope.fileName);
            Wiki.log.debug("file details: ", details);
            updateSourceView();
            Core.$apply($scope);
        }
        function updateSourceView() {
            if (form) {
                if (isCreate()) {
                    // lets default a file name
                    if (!$scope.fileName) {
                        $scope.fileName = "" + Core.getUUID() + ".json";
                    }
                }
                // now lets try load the form defintion JSON so we can then render the form
                $scope.sourceView = null;
                if (form === "/") {
                    onFormSchema(_jsonSchema);
                }
                else {
                    $scope.git = wikiRepository.getPage($scope.branch, form, $scope.objectId, function (details) {
                        onFormSchema(Wiki.parseJson(details.text));
                    });
                }
            }
            else {
                $scope.sourceView = "app/wiki/html/sourceEdit.html";
            }
        }
        function onFormSchema(json) {
            $scope.formDefinition = json;
            if ($scope.entity.source) {
                $scope.formEntity = Wiki.parseJson($scope.entity.source);
            }
            $scope.sourceView = "app/wiki/html/formEdit.html";
            Core.$apply($scope);
        }
        function goToView() {
            var path = Core.trimLeading($scope.viewLink(), "#");
            Wiki.log.debug("going to view " + path);
            $location.path(Wiki.decodePath(path));
            Wiki.log.debug("location is now " + $location.path());
        }
        function saveTo(path) {
            var commitMessage = $scope.commitMessage || "Updated page " + $scope.pageId;
            var contents = $scope.entity.source;
            if ($scope.formEntity) {
                contents = JSON.stringify($scope.formEntity, null, "  ");
            }
            Wiki.log.debug("Saving file, branch: ", $scope.branch, " path: ", $scope.path);
            //console.log("About to write contents '" + contents + "'");
            wikiRepository.putPage($scope.branch, path, contents, commitMessage, function (status) {
                Wiki.onComplete(status);
                $scope.modified = false;
                Core.notification("success", "Saved " + path);
                goToView();
                Core.$apply($scope);
            });
        }
    }]);
})(Wiki || (Wiki = {}));

/// <reference path="../../includes.ts"/>
/// <reference path="../../git/ts/gitHelpers.ts"/>
/// <reference path="wikiHelpers.ts"/>
/**
 * @module Wiki
 */
var Wiki;
(function (Wiki) {
    Wiki._module.controller("Wiki.FormTableController", ["$scope", "$location", "$routeParams", "workspace", "wikiRepository", function ($scope, $location, $routeParams, workspace, wikiRepository) {
        Wiki.initScope($scope, $routeParams, $location);
        $scope.columnDefs = [];
        $scope.gridOptions = {
            data: 'list',
            displayFooter: false,
            showFilter: false,
            filterOptions: {
                filterText: ''
            },
            columnDefs: $scope.columnDefs
        };
        $scope.viewLink = function (row) {
            return childLink(row, "/view");
        };
        $scope.editLink = function (row) {
            return childLink(row, "/edit");
        };
        function childLink(child, prefix) {
            var start = Wiki.startLink($scope.branch);
            var childId = (child) ? child["_id"] || "" : "";
            return Core.createHref($location, start + prefix + "/" + $scope.pageId + "/" + childId);
        }
        var linksColumn = {
            field: '_id',
            displayName: 'Actions',
            cellTemplate: '<div class="ngCellText""><a ng-href="{{viewLink(row.entity)}}" class="btn">View</a> <a ng-href="{{editLink(row.entity)}}" class="btn">Edit</a></div>'
        };
        $scope.$watch('workspace.tree', function () {
            if (!$scope.git && Git.getGitMBean(workspace)) {
                // lets do this asynchronously to avoid Error: $digest already in progress
                //console.log("Reloading the view as we now seem to have a git mbean!");
                setTimeout(updateView, 50);
            }
        });
        $scope.$on("$routeChangeSuccess", function (event, current, previous) {
            // lets do this asynchronously to avoid Error: $digest already in progress
            setTimeout(updateView, 50);
        });
        var form = $location.search()["form"];
        if (form) {
            wikiRepository.getPage($scope.branch, form, $scope.objectId, onFormData);
        }
        updateView();
        function onResults(response) {
            var list = [];
            var map = Wiki.parseJson(response);
            angular.forEach(map, function (value, key) {
                value["_id"] = key;
                list.push(value);
            });
            $scope.list = list;
            Core.$apply($scope);
        }
        function updateView() {
            var filter = Core.pathGet($scope, ["gridOptions", "filterOptions", "filterText"]) || "";
            $scope.git = wikiRepository.jsonChildContents($scope.pageId, "*.json", filter, onResults);
        }
        function onFormData(details) {
            var text = details.text;
            if (text) {
                $scope.formDefinition = Wiki.parseJson(text);
                var columnDefs = [];
                var schema = $scope.formDefinition;
                angular.forEach(schema.properties, function (property, name) {
                    if (name) {
                        if (!Forms.isArrayOrNestedObject(property, schema)) {
                            var colDef = {
                                field: name,
                                displayName: property.description || name,
                                visible: true
                            };
                            columnDefs.push(colDef);
                        }
                    }
                });
                columnDefs.push(linksColumn);
                $scope.columnDefs = columnDefs;
                $scope.gridOptions.columnDefs = columnDefs;
                // now we have the grid column stuff loaded, lets load the datatable
                $scope.tableView = "app/wiki/html/formTableDatatable.html";
            }
        }
        Core.$apply($scope);
    }]);
})(Wiki || (Wiki = {}));

/// <reference path="../../includes.ts"/>
/// <reference path="wikiHelpers.ts"/>
/**
 * @module Wiki
 */
var Wiki;
(function (Wiki) {
    Wiki._module.controller("Wiki.GitPreferences", ["$scope", "localStorage", "userDetails", function ($scope, localStorage, userDetails) {
        Core.initPreferenceScope($scope, localStorage, {
            'gitUserName': {
                'value': userDetails.username
            },
            'gitUserEmail': {
                'value': ''
            }
        });
    }]);
})(Wiki || (Wiki = {}));

/// <reference path="../../includes.ts"/>
/// <reference path="../../git/ts/gitHelpers.ts"/>
/// <reference path="wikiHelpers.ts"/>
/**
 * @module Wiki
 */
var Wiki;
(function (Wiki) {
    Wiki._module.controller("Wiki.HistoryController", ["$scope", "$location", "$routeParams", "$templateCache", "workspace", "marked", "fileExtensionTypeRegistry", "wikiRepository", "jolokia", function ($scope, $location, $routeParams, $templateCache, workspace, marked, fileExtensionTypeRegistry, wikiRepository, jolokia) {
        var isFmc = Wiki.isFMCContainer(workspace);
        Wiki.initScope($scope, $routeParams, $location);
        $scope.selectedItems = [];
        // TODO we could configure this?
        $scope.dateFormat = 'EEE, MMM d, y : hh:mm:ss a';
        $scope.gridOptions = {
            data: 'logs',
            showFilter: false,
            selectedItems: $scope.selectedItems,
            showSelectionCheckbox: true,
            displaySelectionCheckbox: true,
            filterOptions: {
                filterText: ''
            },
            columnDefs: [
                {
                    field: 'commitHashText',
                    displayName: 'Change',
                    cellTemplate: $templateCache.get('changeCellTemplate.html'),
                    cellFilter: "",
                    width: "*"
                },
                {
                    field: 'date',
                    displayName: 'Modified',
                    cellFilter: "date: dateFormat",
                    width: "**"
                },
                {
                    field: 'author',
                    displayName: 'Author',
                    cellFilter: "",
                    width: "**"
                },
                {
                    field: 'shortMessage',
                    displayName: 'Message',
                    cellTemplate: '<div class="ngCellText" title="{{row.entity.shortMessage}}">{{row.entity.trimmedMessage}}</div>',
                    cellFilter: "",
                    width: "****"
                }
            ]
        };
        $scope.$on("$routeChangeSuccess", function (event, current, previous) {
            // lets do this asynchronously to avoid Error: $digest already in progress
            setTimeout(updateView, 50);
        });
        $scope.$watch('workspace.tree', function () {
            if (!$scope.git && Git.getGitMBean(workspace)) {
                // lets do this asynchronously to avoid Error: $digest already in progress
                //console.log("Reloading the view as we now seem to have a git mbean!");
                setTimeout(updateView, 50);
            }
        });
        $scope.canRevert = function () {
            return $scope.selectedItems.length === 1 && $scope.selectedItems[0] !== $scope.logs[0];
        };
        $scope.revert = function () {
            if ($scope.selectedItems.length > 0) {
                var objectId = $scope.selectedItems[0].name;
                if (objectId) {
                    var commitMessage = "Reverting file " + $scope.pageId + " to previous version " + objectId;
                    wikiRepository.revertTo($scope.branch, objectId, $scope.pageId, commitMessage, function (result) {
                        Wiki.onComplete(result);
                        // now lets update the view
                        Core.notification('success', "Successfully reverted " + $scope.pageId);
                        updateView();
                    });
                }
                $scope.selectedItems.splice(0, $scope.selectedItems.length);
            }
        };
        $scope.diff = function () {
            var defaultValue = " ";
            var objectId = defaultValue;
            if ($scope.selectedItems.length > 0) {
                objectId = $scope.selectedItems[0].name || defaultValue;
            }
            var baseObjectId = defaultValue;
            if ($scope.selectedItems.length > 1) {
                baseObjectId = $scope.selectedItems[1].name || defaultValue;
                // make the objectId (the one that will start with b/ path) always newer than baseObjectId
                if ($scope.selectedItems[0].date < $scope.selectedItems[1].date) {
                    var _ = baseObjectId;
                    baseObjectId = objectId;
                    objectId = _;
                }
            }
            var link = Wiki.startLink($scope.branch) + "/diff/" + $scope.pageId + "/" + objectId + "/" + baseObjectId;
            var path = Core.trimLeading(link, "#");
            $location.path(path);
        };
        updateView();
        function updateView() {
            var objectId = "";
            var limit = 0;
            $scope.git = wikiRepository.history($scope.branch, objectId, $scope.pageId, limit, function (logArray) {
                angular.forEach(logArray, function (log) {
                    // lets use the shorter hash for links by default
                    var commitId = log.commitHashText || log.name;
                    log.commitLink = Wiki.startLink($scope.branch) + "/commit/" + $scope.pageId + "/" + commitId;
                });
                $scope.logs = logArray;
                Core.$apply($scope);
            });
            Wiki.loadBranches(jolokia, wikiRepository, $scope, isFmc);
        }
    }]);
})(Wiki || (Wiki = {}));

/// <reference path="../../includes.ts"/>
/// <reference path="../../git/ts/gitHelpers.ts"/>
/// <reference path="wikiHelpers.ts"/>
/**
 * @module Wiki
 */
var Wiki;
(function (Wiki) {
    Wiki._module.controller("Wiki.NavBarController", ["$scope", "$location", "$routeParams", "workspace", "jolokia", "wikiRepository", "wikiBranchMenu", function ($scope, $location, $routeParams, workspace, jolokia, wikiRepository, wikiBranchMenu) {
        var isFmc = Wiki.isFMCContainer(workspace);
        Wiki.initScope($scope, $routeParams, $location);
        $scope.branchMenuConfig = {
            title: $scope.branch,
            items: []
        };
        $scope.ViewMode = Wiki.ViewMode;
        $scope.setViewMode = function (mode) {
            $scope.$emit('Wiki.SetViewMode', mode);
        };
        wikiBranchMenu.applyMenuExtensions($scope.branchMenuConfig.items);
        $scope.$watch('branches', function (newValue, oldValue) {
            if (newValue === oldValue || !newValue) {
                return;
            }
            $scope.branchMenuConfig.items = [];
            if (newValue.length > 0) {
                $scope.branchMenuConfig.items.push({
                    heading: isFmc ? "Versions" : "Branches"
                });
            }
            newValue.sort().forEach(function (item) {
                var menuItem = {
                    title: item,
                    icon: '',
                    action: function () {
                    }
                };
                if (item === $scope.branch) {
                    menuItem.icon = "icon-ok";
                }
                else {
                    menuItem.action = function () {
                        var targetUrl = Wiki.branchLink(item, $scope.pageId, $location);
                        $location.path(Core.toPath(targetUrl));
                        Core.$apply($scope);
                    };
                }
                $scope.branchMenuConfig.items.push(menuItem);
            });
            wikiBranchMenu.applyMenuExtensions($scope.branchMenuConfig.items);
        }, true);
        $scope.createLink = function () {
            var pageId = Wiki.pageId($routeParams, $location);
            return Wiki.createLink($scope.branch, pageId, $location, $scope);
        };
        $scope.startLink = Wiki.startLink($scope.branch);
        $scope.sourceLink = function () {
            var path = $location.path();
            var answer = null;
            angular.forEach(Wiki.customViewLinks($scope), function (link) {
                if (path.startsWith(link)) {
                    answer = Core.createHref($location, Wiki.startLink($scope.branch) + "/view" + path.substring(link.length));
                }
            });
            // remove the form parameter on view/edit links
            return (!answer && $location.search()["form"]) ? Core.createHref($location, "#" + path, ["form"]) : answer;
        };
        $scope.isActive = function (href) {
            if (!href) {
                return false;
            }
            return href.endsWith($routeParams['page']);
        };
        $scope.$on("$routeChangeSuccess", function (event, current, previous) {
            // lets do this asynchronously to avoid Error: $digest already in progress
            setTimeout(loadBreadcrumbs, 50);
        });
        loadBreadcrumbs();
        function switchFromViewToCustomLink(breadcrumb, link) {
            var href = breadcrumb.href;
            if (href) {
                breadcrumb.href = href.replace("wiki/view", link);
            }
        }
        function loadBreadcrumbs() {
            var start = Wiki.startLink($scope.branch);
            var href = start + "/view";
            $scope.breadcrumbs = [
                { href: href, name: "root" }
            ];
            var path = Wiki.pageId($routeParams, $location);
            var array = path ? path.split("/") : [];
            angular.forEach(array, function (name) {
                if (!name.startsWith("/") && !href.endsWith("/")) {
                    href += "/";
                }
                href += Wiki.encodePath(name);
                if (!name.isBlank()) {
                    $scope.breadcrumbs.push({ href: href, name: name });
                }
            });
            // lets swizzle the last one or two to be formTable views if the last or 2nd to last
            var loc = $location.path();
            if ($scope.breadcrumbs.length) {
                var last = $scope.breadcrumbs[$scope.breadcrumbs.length - 1];
                // possibly trim any required file extensions
                last.name = Wiki.hideFileNameExtensions(last.name);
                var swizzled = false;
                angular.forEach(Wiki.customViewLinks($scope), function (link) {
                    if (!swizzled && loc.startsWith(link)) {
                        // lets swizzle the view to the current link
                        switchFromViewToCustomLink($scope.breadcrumbs.last(), Core.trimLeading(link, "/"));
                        swizzled = true;
                    }
                });
                if (!swizzled && $location.search()["form"]) {
                    var lastName = $scope.breadcrumbs.last().name;
                    if (lastName && lastName.endsWith(".json")) {
                        // previous breadcrumb should be a formTable
                        switchFromViewToCustomLink($scope.breadcrumbs[$scope.breadcrumbs.length - 2], "wiki/formTable");
                    }
                }
            }
            /*
            if (loc.startsWith("/wiki/history") || loc.startsWith("/wiki/version")
              || loc.startsWith("/wiki/diff") || loc.startsWith("/wiki/commit")) {
              // lets add a history tab
              $scope.breadcrumbs.push({href: "#/wiki/history/" + path, name: "History"});
            } else if ($scope.branch) {
              var prefix ="/wiki/branch/" + $scope.branch;
              if (loc.startsWith(prefix + "/history") || loc.startsWith(prefix + "/version")
                || loc.startsWith(prefix + "/diff") || loc.startsWith(prefix + "/commit")) {
                // lets add a history tab
                $scope.breadcrumbs.push({href: "#/wiki/branch/" + $scope.branch + "/history/" + path, name: "History"});
              }
            }
            */
            var name = null;
            if (loc.startsWith("/wiki/version")) {
                // lets add a version tab
                name = ($routeParams["objectId"] || "").substring(0, 6) || "Version";
                $scope.breadcrumbs.push({ href: "#" + loc, name: name });
            }
            if (loc.startsWith("/wiki/diff")) {
                // lets add a version tab
                var v1 = ($routeParams["objectId"] || "").substring(0, 6);
                var v2 = ($routeParams["baseObjectId"] || "").substring(0, 6);
                name = "Diff";
                if (v1) {
                    if (v2) {
                        name += " " + v1 + " " + v2;
                    }
                    else {
                        name += " " + v1;
                    }
                }
                $scope.breadcrumbs.push({ href: "#" + loc, name: name });
            }
            Core.$apply($scope);
        }
    }]);
})(Wiki || (Wiki = {}));

/// <reference path="../../includes.ts"/>
/// <reference path="../../git/ts/gitHelpers.ts"/>
/// <reference path="wikiHelpers.ts"/>
/**
 * @module Wiki
 */
var Wiki;
(function (Wiki) {
    // controller for handling file drops
    Wiki.FileDropController = Wiki._module.controller("Wiki.FileDropController", ["$scope", "FileUploader", "$route", "$timeout", "userDetails", function ($scope, FileUploader, $route, $timeout, userDetails) {
        var uploadURI = Wiki.gitRestURL($scope.branch, $scope.pageId) + '/';
        var uploader = $scope.uploader = new FileUploader({
            headers: {
                'Authorization': Core.authHeaderValue(userDetails)
            },
            autoUpload: true,
            withCredentials: true,
            method: 'POST',
            url: uploadURI
        });
        $scope.doUpload = function () {
            uploader.uploadAll();
        };
        uploader.onWhenAddingFileFailed = function (item /*{File|FileLikeObject}*/, filter, options) {
            Wiki.log.debug('onWhenAddingFileFailed', item, filter, options);
        };
        uploader.onAfterAddingFile = function (fileItem) {
            Wiki.log.debug('onAfterAddingFile', fileItem);
        };
        uploader.onAfterAddingAll = function (addedFileItems) {
            Wiki.log.debug('onAfterAddingAll', addedFileItems);
        };
        uploader.onBeforeUploadItem = function (item) {
            if ('file' in item) {
                item.fileSizeMB = (item.file.size / 1024 / 1024).toFixed(2);
            }
            else {
                item.fileSizeMB = 0;
            }
            //item.url = UrlHelpers.join(uploadURI, item.file.name);
            item.url = uploadURI;
            Wiki.log.info("Loading files to " + uploadURI);
            Wiki.log.debug('onBeforeUploadItem', item);
        };
        uploader.onProgressItem = function (fileItem, progress) {
            Wiki.log.debug('onProgressItem', fileItem, progress);
        };
        uploader.onProgressAll = function (progress) {
            Wiki.log.debug('onProgressAll', progress);
        };
        uploader.Core.onSuccessItem = function (fileItem, response, status, headers) {
            Wiki.log.debug('Core.onSuccessItem', fileItem, response, status, headers);
        };
        uploader.onErrorItem = function (fileItem, response, status, headers) {
            Wiki.log.debug('onErrorItem', fileItem, response, status, headers);
        };
        uploader.onCancelItem = function (fileItem, response, status, headers) {
            Wiki.log.debug('onCancelItem', fileItem, response, status, headers);
        };
        uploader.onCompleteItem = function (fileItem, response, status, headers) {
            Wiki.log.debug('onCompleteItem', fileItem, response, status, headers);
        };
        uploader.onCompleteAll = function () {
            Wiki.log.debug('onCompleteAll');
            uploader.clearQueue();
            $timeout(function () {
                Wiki.log.info("Completed all uploads. Lets force a reload");
                $route.reload();
                Core.$apply($scope);
            }, 200);
        };
    }]);
    // main page controller
    Wiki.ViewController = Wiki._module.controller("Wiki.ViewController", ["$scope", "$location", "$routeParams", "$route", "$http", "$timeout", "workspace", "marked", "fileExtensionTypeRegistry", "wikiRepository", "$compile", "$templateCache", "jolokia", "localStorage", "$interpolate", "$dialog", function ($scope, $location, $routeParams, $route, $http, $timeout, workspace, marked, fileExtensionTypeRegistry, wikiRepository, $compile, $templateCache, jolokia, localStorage, $interpolate, $dialog) {
        $scope.name = "WikiViewController";
        var isFmc = Wiki.isFMCContainer(workspace);
        Wiki.initScope($scope, $routeParams, $location);
        SelectionHelpers.decorate($scope);
        $scope.fabricTopLevel = "fabric/profiles/";
        $scope.versionId = $scope.branch;
        $scope.paneTemplate = '';
        $scope.profileId = Fabric.pagePathToProfileId($scope.pageId);
        $scope.showProfileHeader = $scope.profileId && $scope.pageId.endsWith(Fabric.profileSuffix) ? true : false;
        $scope.showAppHeader = false;
        $scope.operationCounter = 1;
        $scope.renameDialog = null;
        $scope.moveDialog = null;
        $scope.deleteDialog = null;
        $scope.isFile = false;
        $scope.rename = {
            newFileName: ""
        };
        $scope.move = {
            moveFolder: ""
        };
        $scope.ViewMode = Wiki.ViewMode;
        // bind filter model values to search params...
        Core.bindModelToSearchParam($scope, $location, "searchText", "q", "");
        StorageHelpers.bindModelToLocalStorage({
            $scope: $scope,
            $location: $location,
            localStorage: localStorage,
            modelName: 'mode',
            paramName: 'wikiViewMode',
            initialValue: 0 /* List */,
            to: Core.numberToString,
            from: Core.parseIntValue
        });
        // only reload the page if certain search parameters change
        Core.reloadWhenParametersChange($route, $scope, $location, ['wikiViewMode']);
        $scope.gridOptions = {
            data: 'children',
            displayFooter: false,
            selectedItems: [],
            showSelectionCheckbox: true,
            enableSorting: false,
            useExternalSorting: true,
            columnDefs: [
                {
                    field: 'name',
                    displayName: 'Name',
                    cellTemplate: $templateCache.get('fileCellTemplate.html'),
                    headerCellTemplate: $templateCache.get('fileColumnTemplate.html')
                }
            ]
        };
        $scope.$on('Wiki.SetViewMode', function ($event, mode) {
            $scope.mode = mode;
            switch (mode) {
                case 0 /* List */:
                    Wiki.log.debug("List view mode");
                    break;
                case 1 /* Icon */:
                    Wiki.log.debug("Icon view mode");
                    break;
                default:
                    $scope.mode = 0 /* List */;
                    Wiki.log.debug("Defaulting to list view mode");
                    break;
            }
        });
        $scope.childActions = [];
        var maybeUpdateView = Core.throttled(updateView, 1000);
        $scope.marked = function (text) {
            if (text) {
                return marked(text);
            }
            else {
                return '';
            }
        };
        $scope.$on('wikiBranchesUpdated', function () {
            updateView();
        });
        $scope.createDashboardLink = function () {
            var href = '/wiki/branch/:branch/view/*page';
            var page = $routeParams['page'];
            var title = page ? page.split("/").last() : null;
            var size = angular.toJson({
                size_x: 2,
                size_y: 2
            });
            var answer = "#/dashboard/add?tab=dashboard" + "&href=" + encodeURIComponent(href) + "&size=" + encodeURIComponent(size) + "&routeParams=" + encodeURIComponent(angular.toJson($routeParams));
            if (title) {
                answer += "&title=" + encodeURIComponent(title);
            }
            return answer;
        };
        $scope.displayClass = function () {
            if (!$scope.children || $scope.children.length === 0) {
                return "";
            }
            return "span9";
        };
        $scope.parentLink = function () {
            var start = Wiki.startLink($scope.branch);
            var prefix = start + "/view";
            //log.debug("pageId: ", $scope.pageId)
            var parts = $scope.pageId.split("/");
            //log.debug("parts: ", parts);
            var path = "/" + parts.first(parts.length - 1).join("/");
            //log.debug("path: ", path);
            return Core.createHref($location, prefix + path, []);
        };
        $scope.childLink = function (child) {
            var start = Wiki.startLink($scope.branch);
            var prefix = start + "/view";
            var postFix = "";
            var path = Wiki.encodePath(child.path);
            if (child.directory) {
                // if we are a folder with the same name as a form file, lets add a form param...
                var formPath = path + ".form";
                var children = $scope.children;
                if (children) {
                    var formFile = children.find(function (child) {
                        return child['path'] === formPath;
                    });
                    if (formFile) {
                        prefix = start + "/formTable";
                        postFix = "?form=" + formPath;
                    }
                }
            }
            else {
                var xmlNamespaces = child.xmlNamespaces;
                if (xmlNamespaces && xmlNamespaces.length) {
                    if (xmlNamespaces.any(function (ns) { return Wiki.camelNamespaces.any(ns); })) {
                        prefix = start + "/camel/canvas";
                    }
                    else if (xmlNamespaces.any(function (ns) { return Wiki.dozerNamespaces.any(ns); })) {
                        prefix = start + "/dozer/mappings";
                    }
                    else {
                        Wiki.log.debug("child " + path + " has namespaces " + xmlNamespaces);
                    }
                }
                if (child.path.endsWith(".form")) {
                    postFix = "?form=/";
                }
                else if (Wiki.isIndexPage(child.path)) {
                    // lets default to book view on index pages
                    prefix = start + "/book";
                }
            }
            return Core.createHref($location, prefix + path + postFix, ["form"]);
        };
        $scope.fileName = function (entity) {
            return Wiki.hideFileNameExtensions(entity.displayName || entity.name);
        };
        $scope.fileClass = function (entity) {
            if (entity.name.has(".profile")) {
                return "green";
            }
            return "";
        };
        $scope.fileIconHtml = function (entity) {
            return Wiki.fileIconHtml(entity);
        };
        $scope.format = Wiki.fileFormat($scope.pageId, fileExtensionTypeRegistry);
        var options = {
            readOnly: true,
            mode: {
                name: $scope.format
            }
        };
        $scope.codeMirrorOptions = CodeEditor.createEditorSettings(options);
        $scope.editLink = function () {
            var pageName = ($scope.directory) ? $scope.readMePath : $scope.pageId;
            return (pageName) ? Wiki.editLink($scope.branch, pageName, $location) : null;
        };
        $scope.branchLink = function (branch) {
            if (branch) {
                return Wiki.branchLink(branch, $scope.pageId, $location);
            }
            return null;
        };
        $scope.historyLink = "#/wiki" + ($scope.branch ? "/branch/" + $scope.branch : "") + "/history/" + $scope.pageId;
        $scope.$watch('workspace.tree', function () {
            if (!$scope.git && Git.getGitMBean(workspace)) {
                // lets do this asynchronously to avoid Error: $digest already in progress
                //log.info("Reloading view as the tree changed and we have a git mbean now");
                setTimeout(maybeUpdateView, 50);
            }
        });
        $scope.$on("$routeChangeSuccess", function (event, current, previous) {
            // lets do this asynchronously to avoid Error: $digest already in progress
            //log.info("Reloading view due to $routeChangeSuccess");
            setTimeout(maybeUpdateView, 50);
        });
        $scope.openDeleteDialog = function () {
            if ($scope.gridOptions.selectedItems.length) {
                $scope.selectedFileHtml = "<ul>" + $scope.gridOptions.selectedItems.map(function (file) { return "<li>" + file.name + "</li>"; }).sort().join("") + "</ul>";
                if ($scope.gridOptions.selectedItems.find(function (file) {
                    return file.name.endsWith(".profile");
                })) {
                    $scope.deleteWarning = "You are about to delete document(s) which represent Fabric8 profile(s). This really can't be undone! Wiki operations are low level and may lead to non-functional state of Fabric.";
                }
                else {
                    $scope.deleteWarning = null;
                }
                $scope.deleteDialog = Wiki.getDeleteDialog($dialog, {
                    callbacks: function () {
                        return $scope.deleteAndCloseDialog;
                    },
                    selectedFileHtml: function () {
                        return $scope.selectedFileHtml;
                    },
                    warning: function () {
                        return $scope.deleteWarning;
                    }
                });
                $scope.deleteDialog.open();
            }
            else {
                Wiki.log.debug("No items selected right now! " + $scope.gridOptions.selectedItems);
            }
        };
        $scope.deleteAndCloseDialog = function () {
            var files = $scope.gridOptions.selectedItems;
            var fileCount = files.length;
            Wiki.log.debug("Deleting selection: " + files);
            angular.forEach(files, function (file, idx) {
                var path = $scope.pageId + "/" + file.name;
                Wiki.log.debug("About to delete " + path);
                $scope.git = wikiRepository.removePage($scope.branch, path, null, function (result) {
                    if (idx + 1 === fileCount) {
                        $scope.gridOptions.selectedItems.splice(0, fileCount);
                        var message = Core.maybePlural(fileCount, "document");
                        Core.notification("success", "Deleted " + message);
                        Core.$apply($scope);
                        updateView();
                    }
                });
            });
            $scope.deleteDialog.close();
        };
        $scope.$watch("rename.newFileName", function () {
            // ignore errors if the file is the same as the rename file!
            var path = getRenameFilePath();
            if ($scope.originalRenameFilePath === path) {
                $scope.fileExists = { exists: false, name: null };
            }
            else {
                checkFileExists(path);
            }
        });
        $scope.renameAndCloseDialog = function () {
            if ($scope.gridOptions.selectedItems.length) {
                var selected = $scope.gridOptions.selectedItems[0];
                var newPath = getRenameFilePath();
                if (selected && newPath) {
                    var oldName = selected.name;
                    var newName = Wiki.fileName(newPath);
                    var oldPath = $scope.pageId + "/" + oldName;
                    Wiki.log.debug("About to rename file " + oldPath + " to " + newPath);
                    $scope.git = wikiRepository.rename($scope.branch, oldPath, newPath, null, function (result) {
                        Core.notification("success", "Renamed file to  " + newName);
                        $scope.gridOptions.selectedItems.splice(0, 1);
                        $scope.renameDialog.close();
                        Core.$apply($scope);
                        updateView();
                    });
                }
            }
            $scope.renameDialog.close();
        };
        $scope.openRenameDialog = function () {
            var name = null;
            if ($scope.gridOptions.selectedItems.length) {
                var selected = $scope.gridOptions.selectedItems[0];
                name = selected.name;
            }
            if (name) {
                $scope.rename.newFileName = name;
                $scope.originalRenameFilePath = getRenameFilePath();
                $scope.renameDialog = Wiki.getRenameDialog($dialog, {
                    rename: function () {
                        return $scope.rename;
                    },
                    fileExists: function () {
                        return $scope.fileExists;
                    },
                    fileName: function () {
                        return $scope.fileName;
                    },
                    callbacks: function () {
                        return $scope.renameAndCloseDialog;
                    }
                });
                $scope.renameDialog.open();
                $timeout(function () {
                    $('#renameFileName').focus();
                }, 50);
            }
            else {
                Wiki.log.debug("No items selected right now! " + $scope.gridOptions.selectedItems);
            }
        };
        $scope.moveAndCloseDialog = function () {
            var files = $scope.gridOptions.selectedItems;
            var fileCount = files.length;
            var moveFolder = $scope.move.moveFolder;
            var oldFolder = $scope.pageId;
            if (moveFolder && fileCount && moveFolder !== oldFolder) {
                Wiki.log.debug("Moving " + fileCount + " file(s) to " + moveFolder);
                angular.forEach(files, function (file, idx) {
                    var oldPath = oldFolder + "/" + file.name;
                    var newPath = moveFolder + "/" + file.name;
                    Wiki.log.debug("About to move " + oldPath + " to " + newPath);
                    $scope.git = wikiRepository.rename($scope.branch, oldPath, newPath, null, function (result) {
                        if (idx + 1 === fileCount) {
                            $scope.gridOptions.selectedItems.splice(0, fileCount);
                            var message = Core.maybePlural(fileCount, "document");
                            Core.notification("success", "Moved " + message + " to " + newPath);
                            $scope.moveDialog.close();
                            Core.$apply($scope);
                            updateView();
                        }
                    });
                });
            }
            $scope.moveDialog.close();
        };
        $scope.folderNames = function (text) {
            return wikiRepository.completePath($scope.branch, text, true, null);
        };
        $scope.openMoveDialog = function () {
            if ($scope.gridOptions.selectedItems.length) {
                $scope.move.moveFolder = $scope.pageId;
                $scope.moveDialog = Wiki.getMoveDialog($dialog, {
                    move: function () {
                        return $scope.move;
                    },
                    folderNames: function () {
                        return $scope.folderNames;
                    },
                    callbacks: function () {
                        return $scope.moveAndCloseDialog;
                    }
                });
                $scope.moveDialog.open();
                $timeout(function () {
                    $('#moveFolder').focus();
                }, 50);
            }
            else {
                Wiki.log.debug("No items selected right now! " + $scope.gridOptions.selectedItems);
            }
        };
        setTimeout(maybeUpdateView, 50);
        function isDiffView() {
            var path = $location.path();
            return path && (path.startsWith("/wiki/diff") || path.startsWith("/wiki/branch/" + $scope.branch + "/diff"));
        }
        function updateView() {
            if (isDiffView()) {
                var baseObjectId = $routeParams["baseObjectId"];
                $scope.git = wikiRepository.diff($scope.objectId, baseObjectId, $scope.pageId, onFileDetails);
            }
            else {
                $scope.git = wikiRepository.getPage($scope.branch, $scope.pageId, $scope.objectId, onFileDetails);
            }
            Wiki.loadBranches(jolokia, wikiRepository, $scope, isFmc);
        }
        $scope.updateView = updateView;
        function viewContents(pageName, contents) {
            $scope.sourceView = null;
            var format = null;
            if (isDiffView()) {
                format = "diff";
            }
            else {
                format = Wiki.fileFormat(pageName, fileExtensionTypeRegistry) || $scope.format;
            }
            Wiki.log.debug("File format: ", format);
            switch (format) {
                case "image":
                    var imageURL = 'git/' + $scope.branch;
                    Wiki.log.debug("$scope: ", $scope);
                    imageURL = UrlHelpers.join(imageURL, $scope.pageId);
                    var interpolateFunc = $interpolate($templateCache.get("imageTemplate.html"));
                    $scope.html = interpolateFunc({
                        imageURL: imageURL
                    });
                    break;
                case "markdown":
                    $scope.html = contents ? marked(contents) : "";
                    break;
                case "javascript":
                    var form = null;
                    form = $location.search()["form"];
                    $scope.source = contents;
                    $scope.form = form;
                    if (form) {
                        // now lets try load the form JSON so we can then render the form
                        $scope.sourceView = null;
                        if (form === "/") {
                            onFormSchema(_jsonSchema);
                        }
                        else {
                            $scope.git = wikiRepository.getPage($scope.branch, form, $scope.objectId, function (details) {
                                onFormSchema(Wiki.parseJson(details.text));
                            });
                        }
                    }
                    else {
                        $scope.sourceView = "app/wiki/html/sourceView.html";
                    }
                    break;
                default:
                    $scope.html = null;
                    $scope.source = contents;
                    $scope.sourceView = "app/wiki/html/sourceView.html";
            }
            Core.$apply($scope);
        }
        function onFormSchema(json) {
            $scope.formDefinition = json;
            if ($scope.source) {
                $scope.formEntity = Wiki.parseJson($scope.source);
            }
            $scope.sourceView = "app/wiki/html/formView.html";
            Core.$apply($scope);
        }
        function onFileDetails(details) {
            var contents = details.text;
            $scope.directory = details.directory;
            $scope.fileDetails = details;
            if (details && details.format) {
                $scope.format = details.format;
            }
            else {
                $scope.format = Wiki.fileFormat($scope.pageId, fileExtensionTypeRegistry);
            }
            $scope.codeMirrorOptions.mode.name = $scope.format;
            $scope.children = null;
            if (details.directory) {
                var directories = details.children.filter(function (dir) {
                    return dir.directory && !dir.name.has(".profile");
                });
                var profiles = details.children.filter(function (dir) {
                    return dir.directory && dir.name.has(".profile");
                });
                var files = details.children.filter(function (file) {
                    return !file.directory;
                });
                directories = directories.sortBy(function (dir) {
                    return dir.name;
                });
                profiles = profiles.sortBy(function (dir) {
                    return dir.name;
                });
                files = files.sortBy(function (file) {
                    return file.name;
                }).sortBy(function (file) {
                    return file.name.split('.').last();
                });
                // Also enrich the response with the current branch, as that's part of the coordinate for locating the actual file in git
                $scope.children = Array.create(directories, profiles, files).map(function (file) {
                    file.branch = $scope.branch;
                    file.fileName = file.name;
                    if (file.directory) {
                        file.fileName += ".zip";
                    }
                    file.downloadURL = Wiki.gitRestURL($scope.branch, file.path);
                    return file;
                });
            }
            $scope.html = null;
            $scope.source = null;
            $scope.readMePath = null;
            $scope.isFile = false;
            if ($scope.children) {
                $scope.$broadcast('pane.open');
                // if we have a readme then lets render it...
                var item = $scope.children.find(function (info) {
                    var name = (info.name || "").toLowerCase();
                    var ext = Wiki.fileExtension(name);
                    return name && ext && ((name.startsWith("readme.") || name === "readme") || (name.startsWith("index.") || name === "index"));
                });
                if (item) {
                    var pageName = item.path;
                    $scope.readMePath = pageName;
                    wikiRepository.getPage($scope.branch, pageName, $scope.objectId, function (readmeDetails) {
                        viewContents(pageName, readmeDetails.text);
                    });
                }
                var kubernetesJson = $scope.children.find(function (child) {
                    var name = (child.name || "").toLowerCase();
                    var ext = Wiki.fileExtension(name);
                    return name && ext && name.startsWith("kubernetes") && ext === "json";
                });
                if (kubernetesJson) {
                    wikiRepository.getPage($scope.branch, kubernetesJson.path, undefined, function (json) {
                        if (json && json.text) {
                            try {
                                $scope.kubernetesJson = angular.fromJson(json.text);
                            }
                            catch (e) {
                                $scope.kubernetesJson = {
                                    errorParsing: true,
                                    error: e
                                };
                            }
                            $scope.showAppHeader = true;
                            Core.$apply($scope);
                        }
                    });
                }
                $scope.$broadcast('Wiki.ViewPage.Children', $scope.pageId, $scope.children);
            }
            else {
                $scope.$broadcast('pane.close');
                var pageName = $scope.pageId;
                viewContents(pageName, contents);
                $scope.isFile = true;
            }
            Core.$apply($scope);
        }
        function checkFileExists(path) {
            $scope.operationCounter += 1;
            var counter = $scope.operationCounter;
            if (path) {
                wikiRepository.exists($scope.branch, path, function (result) {
                    // filter old results
                    if ($scope.operationCounter === counter) {
                        Wiki.log.debug("checkFileExists for path " + path + " got result " + result);
                        $scope.fileExists.exists = result ? true : false;
                        $scope.fileExists.name = result ? result.name : null;
                        Core.$apply($scope);
                    }
                    else {
                    }
                });
            }
        }
        // Called by hawtio TOC directive...
        $scope.getContents = function (filename, cb) {
            var pageId = filename;
            if ($scope.directory) {
                pageId = $scope.pageId + '/' + filename;
            }
            else {
                var pathParts = $scope.pageId.split('/');
                pathParts = pathParts.remove(pathParts.last());
                pathParts.push(filename);
                pageId = pathParts.join('/');
            }
            Wiki.log.debug("pageId: ", $scope.pageId);
            Wiki.log.debug("branch: ", $scope.branch);
            Wiki.log.debug("filename: ", filename);
            Wiki.log.debug("using pageId: ", pageId);
            wikiRepository.getPage($scope.branch, pageId, undefined, function (data) {
                cb(data.text);
            });
        };
        function getRenameFilePath() {
            var newFileName = $scope.rename.newFileName;
            return ($scope.pageId && newFileName) ? $scope.pageId + "/" + newFileName : null;
        }
    }]);
})(Wiki || (Wiki = {}));

/// <reference path="../../includes.ts"/>
/// <reference path="wikiHelpers.ts"/>
var Wiki;
(function (Wiki) {
    function getRenameDialog($dialog, $scope) {
        return $dialog.dialog({
            resolve: $scope,
            templateUrl: 'app/wiki/html/modal/renameDialog.html',
            controller: ["$scope", "dialog", "callbacks", "rename", "fileExists", "fileName", function ($scope, dialog, callbacks, rename, fileExists, fileName) {
                $scope.rename = rename;
                $scope.fileExists = fileExists;
                $scope.fileName = fileName;
                $scope.close = function (result) {
                    dialog.close();
                };
                $scope.renameAndCloseDialog = callbacks;
            }]
        });
    }
    Wiki.getRenameDialog = getRenameDialog;
    function getMoveDialog($dialog, $scope) {
        return $dialog.dialog({
            resolve: $scope,
            templateUrl: 'app/wiki/html/modal/moveDialog.html',
            controller: ["$scope", "dialog", "callbacks", "move", "folderNames", function ($scope, dialog, callbacks, move, folderNames) {
                $scope.move = move;
                $scope.folderNames = folderNames;
                $scope.close = function (result) {
                    dialog.close();
                };
                $scope.moveAndCloseDialog = callbacks;
            }]
        });
    }
    Wiki.getMoveDialog = getMoveDialog;
    function getDeleteDialog($dialog, $scope) {
        return $dialog.dialog({
            resolve: $scope,
            templateUrl: 'app/wiki/html/modal/deleteDialog.html',
            controller: ["$scope", "dialog", "callbacks", "selectedFileHtml", "warning", function ($scope, dialog, callbacks, selectedFileHtml, warning) {
                $scope.selectedFileHtml = selectedFileHtml;
                $scope.close = function (result) {
                    dialog.close();
                };
                $scope.deleteAndCloseDialog = callbacks;
                $scope.warning = warning;
            }]
        });
    }
    Wiki.getDeleteDialog = getDeleteDialog;
})(Wiki || (Wiki = {}));

/// <reference path="../../includes.ts"/>
/// <reference path="wikiHelpers.ts"/>
var Wiki;
(function (Wiki) {
    Wiki._module.directive('wikiHrefAdjuster', ["$location", function ($location) {
        return {
            restrict: 'A',
            link: function ($scope, $element, $attr) {
                $element.bind('DOMNodeInserted', function (event) {
                    var ays = $element.find('a');
                    angular.forEach(ays, function (a) {
                        if (a.hasAttribute('no-adjust')) {
                            return;
                        }
                        a = $(a);
                        var href = (a.attr('href') || "").trim();
                        if (href) {
                            var fileExtension = a.attr('file-extension');
                            var newValue = Wiki.adjustHref($scope, $location, href, fileExtension);
                            if (newValue) {
                                a.attr('href', newValue);
                            }
                        }
                    });
                    var imgs = $element.find('img');
                    angular.forEach(imgs, function (a) {
                        if (a.hasAttribute('no-adjust')) {
                            return;
                        }
                        a = $(a);
                        var href = (a.attr('src') || "").trim();
                        if (href) {
                            if (href.startsWith("/")) {
                                href = Core.url(href);
                                a.attr('src', href);
                                // lets avoid this element being reprocessed
                                a.attr('no-adjust', 'true');
                            }
                        }
                    });
                });
            }
        };
    }]);
    Wiki._module.directive('wikiTitleLinker', ["$location", function ($location) {
        return {
            restrict: 'A',
            link: function ($scope, $element, $attr) {
                var loaded = false;
                function offsetTop(elements) {
                    if (elements) {
                        var offset = elements.offset();
                        if (offset) {
                            return offset.top;
                        }
                    }
                    return 0;
                }
                function scrollToHash() {
                    var answer = false;
                    var id = $location.search()["hash"];
                    return scrollToId(id);
                }
                function scrollToId(id) {
                    var answer = false;
                    var id = $location.search()["hash"];
                    if (id) {
                        var selector = 'a[name="' + id + '"]';
                        var targetElements = $element.find(selector);
                        if (targetElements && targetElements.length) {
                            var scrollDuration = 1;
                            var delta = offsetTop($($element));
                            var top = offsetTop(targetElements) - delta;
                            if (top < 0) {
                                top = 0;
                            }
                            //log.info("scrolling to hash: " + id + " top: " + top + " delta:" + delta);
                            $('body,html').animate({
                                scrollTop: top
                            }, scrollDuration);
                            answer = true;
                        }
                        else {
                        }
                    }
                    return answer;
                }
                function addLinks(event) {
                    var headings = $element.find('h1,h2,h3,h4,h5,h6,h7');
                    var updated = false;
                    angular.forEach(headings, function (he) {
                        var h1 = $(he);
                        // now lets try find a child header
                        var a = h1.parent("a");
                        if (!a || !a.length) {
                            var text = h1.text();
                            if (text) {
                                var target = text.replace(/ /g, "-");
                                var pathWithHash = "#" + $location.path() + "?hash=" + target;
                                var link = Core.createHref($location, pathWithHash, ['hash']);
                                // lets wrap the heading in a link
                                var newA = $('<a name="' + target + '" href="' + link + '" ng-click="onLinkClick()"></a>');
                                newA.on("click", function () {
                                    setTimeout(function () {
                                        if (scrollToId(target)) {
                                        }
                                    }, 50);
                                });
                                newA.insertBefore(h1);
                                h1.detach();
                                newA.append(h1);
                                updated = true;
                            }
                        }
                    });
                    if (updated && !loaded) {
                        setTimeout(function () {
                            if (scrollToHash()) {
                                loaded = true;
                            }
                        }, 50);
                    }
                }
                function onEventInserted(event) {
                    // avoid any more events while we do our thing
                    $element.unbind('DOMNodeInserted', onEventInserted);
                    addLinks(event);
                    $element.bind('DOMNodeInserted', onEventInserted);
                }
                $element.bind('DOMNodeInserted', onEventInserted);
            }
        };
    }]);
})(Wiki || (Wiki = {}));

/// <reference path="../../includes.ts"/>
/// <reference path="../../git/ts/gitHelpers.ts"/>
/// <reference path="wikiHelpers.ts"/>
/**
 * @module Wiki
 */
var Wiki;
(function (Wiki) {
    /**
     * @class GitWikiRepository
     */
    var GitWikiRepository = (function () {
        function GitWikiRepository(factoryMethod) {
            this.factoryMethod = factoryMethod;
            this.directoryPrefix = "";
        }
        GitWikiRepository.prototype.getRepositoryLabel = function (fn, error) {
            this.git().getRepositoryLabel(fn, error);
        };
        GitWikiRepository.prototype.exists = function (branch, path, fn) {
            var fullPath = this.getPath(path);
            return this.git().exists(branch, fullPath, fn);
        };
        GitWikiRepository.prototype.completePath = function (branch, completionText, directoriesOnly, fn) {
            return this.git().completePath(branch, completionText, directoriesOnly, fn);
        };
        GitWikiRepository.prototype.getPage = function (branch, path, objectId, fn) {
            var _this = this;
            var git = this.git();
            path = path || "/";
            if (git) {
                if (objectId) {
                    var blobPath = this.getLogPath(path);
                    // TODO deal with versioned directories?
                    git.getContent(objectId, blobPath, function (content) {
                        var details = {
                            text: content,
                            directory: false
                        };
                        fn(details);
                    });
                }
                else {
                    var fullPath = this.getPath(path);
                    git.read(branch, fullPath, function (details) {
                        // lets fix up any paths to be relative to the wiki
                        var children = details.children;
                        angular.forEach(children, function (child) {
                            var path = child.path;
                            if (path) {
                                var directoryPrefix = "/" + _this.directoryPrefix;
                                if (path.startsWith(directoryPrefix)) {
                                    path = "/" + path.substring(directoryPrefix.length);
                                    child.path = path;
                                }
                            }
                        });
                        fn(details);
                    });
                }
            }
            return git;
        };
        /**
         * Performs a diff on the versions
         * @method diff
         * @for GitWikiRepository
         * @param {String} objectId
         * @param {String} baseObjectId
         * @param {String} path
         * @param {Function} fn
         * @return {any}
         */
        GitWikiRepository.prototype.diff = function (objectId, baseObjectId, path, fn) {
            var fullPath = this.getLogPath(path);
            var git = this.git();
            if (git) {
                git.diff(objectId, baseObjectId, fullPath, function (content) {
                    var details = {
                        text: content,
                        format: "diff",
                        directory: false
                    };
                    fn(details);
                });
            }
            return git;
        };
        GitWikiRepository.prototype.commitInfo = function (commitId, fn) {
            this.git().commitInfo(commitId, fn);
        };
        GitWikiRepository.prototype.commitTree = function (commitId, fn) {
            this.git().commitTree(commitId, fn);
        };
        GitWikiRepository.prototype.putPage = function (branch, path, contents, commitMessage, fn) {
            var fullPath = this.getPath(path);
            this.git().write(branch, fullPath, commitMessage, contents, fn);
        };
        GitWikiRepository.prototype.putPageBase64 = function (branch, path, contents, commitMessage, fn) {
            var fullPath = this.getPath(path);
            this.git().writeBase64(branch, fullPath, commitMessage, contents, fn);
        };
        GitWikiRepository.prototype.createDirectory = function (branch, path, commitMessage, fn) {
            var fullPath = this.getPath(path);
            this.git().createDirectory(branch, fullPath, commitMessage, fn);
        };
        GitWikiRepository.prototype.revertTo = function (branch, objectId, blobPath, commitMessage, fn) {
            var fullPath = this.getLogPath(blobPath);
            this.git().revertTo(branch, objectId, fullPath, commitMessage, fn);
        };
        GitWikiRepository.prototype.rename = function (branch, oldPath, newPath, commitMessage, fn) {
            var fullOldPath = this.getPath(oldPath);
            var fullNewPath = this.getPath(newPath);
            if (!commitMessage) {
                commitMessage = "Renaming page " + oldPath + " to " + newPath;
            }
            this.git().rename(branch, fullOldPath, fullNewPath, commitMessage, fn);
        };
        GitWikiRepository.prototype.removePage = function (branch, path, commitMessage, fn) {
            var fullPath = this.getPath(path);
            if (!commitMessage) {
                commitMessage = "Removing page " + path;
            }
            this.git().remove(branch, fullPath, commitMessage, fn);
        };
        /**
         * Returns the full path to use in the git repo
         * @method getPath
         * @for GitWikiRepository
         * @param {String} path
         * @return {String{
         */
        GitWikiRepository.prototype.getPath = function (path) {
            var directoryPrefix = this.directoryPrefix;
            return (directoryPrefix) ? directoryPrefix + path : path;
        };
        GitWikiRepository.prototype.getLogPath = function (path) {
            return Core.trimLeading(this.getPath(path), "/");
        };
        /**
         * Return the history of the repository or a specific directory or file path
         * @method history
         * @for GitWikiRepository
         * @param {String} branch
         * @param {String} objectId
         * @param {String} path
         * @param {Number} limit
         * @param {Function} fn
         * @return {any}
         */
        GitWikiRepository.prototype.history = function (branch, objectId, path, limit, fn) {
            var fullPath = this.getLogPath(path);
            var git = this.git();
            if (git) {
                git.history(branch, objectId, fullPath, limit, fn);
            }
            return git;
        };
        /**
         * Get the contents of a blobPath for a given commit objectId
         * @method getContent
         * @for GitWikiRepository
         * @param {String} objectId
         * @param {String} blobPath
         * @param {Function} fn
         * @return {any}
         */
        GitWikiRepository.prototype.getContent = function (objectId, blobPath, fn) {
            var fullPath = this.getLogPath(blobPath);
            var git = this.git();
            if (git) {
                git.getContent(objectId, fullPath, fn);
            }
            return git;
        };
        /**
         * Get the list of branches
         * @method branches
         * @for GitWikiRepository
         * @param {Function} fn
         * @return {any}
         */
        GitWikiRepository.prototype.branches = function (fn) {
            var git = this.git();
            if (git) {
                git.branches(fn);
            }
            return git;
        };
        /**
         * Get the JSON contents of the path with optional name wildcard and search
         * @method jsonChildContents
         * @for GitWikiRepository
         * @param {String} path
         * @param {String} nameWildcard
         * @param {String} search
         * @param {Function} fn
         * @return {any}
         */
        GitWikiRepository.prototype.jsonChildContents = function (path, nameWildcard, search, fn) {
            var fullPath = this.getLogPath(path);
            var git = this.git();
            if (git) {
                git.readJsonChildContent(fullPath, nameWildcard, search, fn);
            }
            return git;
        };
        GitWikiRepository.prototype.git = function () {
            var repository = this.factoryMethod();
            if (!repository) {
                console.log("No repository yet! TODO we should use a local impl!");
            }
            return repository;
        };
        return GitWikiRepository;
    })();
    Wiki.GitWikiRepository = GitWikiRepository;
})(Wiki || (Wiki = {}));

/// <reference path="../../includes.ts"/>
/// <reference path="../../git/ts/gitHelpers.ts"/>
/// <reference path="wikiHelpers.ts"/>
var Wiki;
(function (Wiki) {
    Wiki.TopLevelController = Wiki._module.controller("Wiki.TopLevelController", ['$scope', 'workspace', function ($scope, workspace) {
        $scope.managerMBean = Fabric.managerMBean;
        $scope.clusterBootstrapManagerMBean = Fabric.clusterBootstrapManagerMBean;
        $scope.clusterManagerMBean = Fabric.clusterManagerMBean;
        $scope.openShiftFabricMBean = Fabric.openShiftFabricMBean;
        $scope.mqManagerMBean = Fabric.mqManagerMBean;
        $scope.healthMBean = Fabric.healthMBean;
        $scope.schemaLookupMBean = Fabric.schemaLookupMBean;
        $scope.gitMBean = Git.getGitMBean(workspace);
        $scope.configAdminMBean = Osgi.getHawtioConfigAdminMBean(workspace);
    }]);
})(Wiki || (Wiki = {}));

angular.module("hawtio-wiki-templates", []).run(["$templateCache", function($templateCache) {$templateCache.put("plugins/activemq/html/brokerDiagram.html","<style type=\"text/css\">\n\n.span4.node-panel {\n  margin-top: 10px;\n  margin-left: 10px;\n  width: 33%;\n}\n.node-attributes dl {\n  margin-top: 5px;\n  margin-bottom: 10px;\n}\n.node-attributes dt {\n  width: 150px;\n}\n.node-attributes dd {\n  margin-left: 160px;\n}\n.node-attributes dd a {\n  /** lets make the destination links wrap */\n  -ms-word-break: break-all;\n  word-break: break-all;\n  -webkit-hyphens: auto;\n  -moz-hyphens: auto;\n  hyphens: auto;\n}\n\nul.viewMenu li {\n  padding-left: 10px;\n  padding-top: 2px;\n  padding-bottom: 2px;\n}\n\ndiv#pop-up {\n  display: none;\n  position: absolute;\n  color: white;\n  font-size: 14px;\n  background: rgba(0, 0, 0, 0.6);\n  padding: 5px 10px 5px 10px;\n  -moz-border-radius: 8px 8px;\n  border-radius: 8px 8px;\n}\n\ndiv#pop-up-title {\n  font-size: 15px;\n  margin-bottom: 4px;\n  font-weight: bolder;\n}\n\ndiv#pop-up-content {\n  font-size: 12px;\n}\n\nrect.graphbox {\n  fill: #FFF;\n}\n\nrect.graphbox.frame {\n  stroke: #222;\n  stroke-width: 2px\n}\n\n/* only things directly related to the network graph should be here */\n\npath.link {\n  fill: none;\n  stroke: #666;\n  stroke-width: 1.5px;  b\n}\n\nmarker.broker {\n  stroke: red;\n  fill: red;\n  stroke-width: 1.5px;\n}\n\ncircle.broker {\n  fill: #0c0;\n}\n\ncircle.brokerSlave {\n  fill: #c00;\n}\n\ncircle.notActive {\n  fill: #c00;\n}\n\npath.link.group {\n  stroke: #ccc;\n}\n\nmarker#group {\n  stroke: #ccc;\n  fill: #ccc;\n}\n\ncircle.group {\n  fill: #eee;\n  stroke: #ccc;\n}\n\ncircle.destination {\n  fill: #bbb;\n  stroke: #ccc;\n}\n\ncircle.pinned {\n  stroke-width: 4.5px;\n}\n\npath.link.profile {\n  stroke-dasharray: 0, 2 1;\n  stroke: #888;\n}\n\nmarker#container {\n}\n\ncircle.container {\n  stroke-dasharray: 0, 2 1;\n  stroke: #888;\n}\n\npath.link.container {\n  stroke-dasharray: 0, 2 1;\n  stroke: #888;\n}\n\ncircle {\n  fill: #ccc;\n  stroke: #333;\n  stroke-width: 1.5px;\n  cursor: pointer;\n}\n\ncircle.closeMode {\n  cursor: crosshair;\n}\n\npath.link.destination {\n  stroke: #ccc;\n}\n\ncircle.topic {\n  fill: #c0c;\n}\n\ncircle.queue {\n  fill: #00c;\n}\n\ncircle.consumer {\n  fill: #cfc;\n}\n\ncircle.producer {\n  fill: #ccf;\n}\n\npath.link.producer {\n  stroke: #ccc;\n}\n\npath.link.consumer {\n  stroke: #ccc;\n}\n\npath.link.network {\n  stroke: #ccc;\n}\n\ncircle.selected {\n  stroke-width: 3px;\n}\n\n.selected {\n  stroke-width: 3px;\n}\n\ntext {\n  font: 10px sans-serif;\n  pointer-events: none;\n}\n\ntext.shadow {\n  stroke: #fff;\n  stroke-width: 3px;\n  stroke-opacity: .8;\n}\n</style>\n\n\n<div class=\"row-fluid mq-page\" ng-controller=\"ActiveMQ.BrokerDiagramController\">\n\n  <div ng-hide=\"inDashboard\" class=\"span12 page-padded\">\n    <div class=\"section-header\">\n\n      <div class=\"section-filter\">\n        <input type=\"text\" class=\"search-query\" placeholder=\"Filter...\" ng-model=\"searchFilter\">\n        <i class=\"icon-remove clickable\" title=\"Clear filter\" ng-click=\"searchFilter = \'\'\"></i>\n      </div>\n\n      <div class=\"section-controls\">\n        <a href=\"#\"\n           class=\"dropdown-toggle\"\n           data-toggle=\"dropdown\">\n          View &nbsp;<i class=\"icon-caret-down\"></i>\n        </a>\n\n        <ul class=\"dropdown-menu viewMenu\">\n          <li>\n            <label class=\"checkbox\">\n              <input type=\"checkbox\" ng-model=\"viewSettings.consumer\"> Consumers\n            </label>\n          </li>\n          <li>\n            <label class=\"checkbox\">\n              <input type=\"checkbox\" ng-model=\"viewSettings.producer\"> Producers\n            </label>\n          </li>\n          <li>\n            <label class=\"checkbox\">\n              <input type=\"checkbox\" ng-model=\"viewSettings.queue\"> Queues\n            </label>\n          </li>\n          <li>\n            <label class=\"checkbox\">\n              <input type=\"checkbox\" ng-model=\"viewSettings.topic\"> Topics\n            </label>\n          </li>\n          <li class=\"divider\"></li>\n          <li ng-show=\"isFmc\">\n            <label class=\"checkbox\">\n              <input type=\"checkbox\" ng-model=\"viewSettings.group\"> Broker groups\n            </label>\n          </li>\n          <li ng-show=\"isFmc\">\n            <label class=\"checkbox\">\n              <input type=\"checkbox\" ng-model=\"viewSettings.profile\"> Profiles\n            </label>\n          </li>\n          <li>\n            <label class=\"checkbox\">\n              <input type=\"checkbox\" ng-model=\"viewSettings.broker\"> Brokers\n            </label>\n          </li>\n          <li ng-show=\"isFmc\">\n            <label class=\"checkbox\">\n              <input type=\"checkbox\" ng-model=\"viewSettings.slave\"> Slave brokers\n            </label>\n          </li>\n          <li>\n            <label class=\"checkbox\">\n              <input type=\"checkbox\" ng-model=\"viewSettings.network\"> Networks\n            </label>\n          </li>\n          <li ng-show=\"isFmc\">\n            <label class=\"checkbox\">\n              <input type=\"checkbox\" ng-model=\"viewSettings.container\"> Containers\n            </label>\n          </li>\n          <li class=\"divider\"></li>\n          <li title=\"Should we show the details panel on the left\">\n            <label class=\"checkbox\">\n              <input type=\"checkbox\" ng-model=\"viewSettings.panel\"> Details panel\n            </label>\n          </li>\n          <li title=\"Show the summary popup as you hover over nodes\">\n            <label class=\"checkbox\">\n              <input type=\"checkbox\" ng-model=\"viewSettings.popup\"> Hover text\n            </label>\n          </li>\n          <li title=\"Show the labels next to nodes\">\n            <label class=\"checkbox\">\n              <input type=\"checkbox\" ng-model=\"viewSettings.label\"> Label\n            </label>\n          </li>\n        </ul>\n\n        <a ng-show=\"isFmc\" ng-href=\"#/fabric/mq/brokers{{hash}}\" title=\"View the broker and container diagram\">\n          <i class=\"icon-edit\"></i> Configuration\n        </a>\n      </div>\n    </div>\n  </div>\n\n\n  <div id=\"pop-up\">\n    <div id=\"pop-up-title\"></div>\n    <div id=\"pop-up-content\"></div>\n  </div>\n\n  <div class=\"row-fluid\">\n    <div class=\"{{viewSettings.panel ? \'span8\' : \'span12\'}} canvas broker-canvas\">\n      <div hawtio-force-graph graph=\"graph\" selected-model=\"selectedNode\" link-distance=\"150\" charge=\"-600\" nodesize=\"10\" marker-kind=\"marker-end\"\n           style=\"min-height: 800px\">\n      </div>\n    </div>\n    <div ng-show=\"viewSettings.panel\" class=\"span4 node-panel\">\n      <div ng-show=\"selectedNode\" class=\"node-attributes\">\n        <dl ng-repeat=\"property in selectedNodeProperties\" class=\"dl-horizontal\">\n          <dt title=\"{{property.key}}\">{{property.key}}:</dt>\n          <dd ng-bind-html-unsafe=\"property.value\"></dd>\n        </dl>\n      </div>\n    </div>\n  </div>\n\n  <div ng-include=\"\'app/fabric/html/connectToContainerDialog.html\'\"></div>\n\n</div>\n\n\n");
$templateCache.put("plugins/activemq/html/browseQueue.html","<div ng-controller=\"ActiveMQ.BrowseQueueController\">\n  <div class=\"row-fluid\">\n    <div class=\"span6\">\n      <input class=\"search-query span12\" type=\"text\" ng-model=\"gridOptions.filterOptions.filterText\"\n             placeholder=\"Filter messages\">\n    </div>\n    <div class=\"span6\">\n      <div class=\"pull-right\">\n        <form class=\"form-inline\">\n          <button class=\"btn\" ng-disabled=\"!gridOptions.selectedItems.length\" ng-show=\"dlq\" ng-click=\"retryMessages()\"\n                  title=\"Moves the dead letter queue message back to its original destination so it can be retried\" data-placement=\"bottom\">\n            <i class=\"icon-reply\"></i> Retry\n          </button>\n          <button class=\"btn\" ng-disabled=\"gridOptions.selectedItems.length !== 1\" ng-click=\"resendMessage()\"\n                    title=\"Edit the message to resend it\" data-placement=\"bottom\">\n           <i class=\"icon-share-alt\"></i> Resend\n          </button>\n\n          <button class=\"btn\" ng-disabled=\"!gridOptions.selectedItems.length\" ng-click=\"moveDialog = true\"\n                  title=\"Move the selected messages to another destination\" data-placement=\"bottom\">\n            <i class=\"icon-share-alt\"></i> Move\n          </button>\n          <button class=\"btn\" ng-disabled=\"!gridOptions.selectedItems.length\"\n                  ng-click=\"deleteDialog = true\"\n                  title=\"Delete the selected messages\">\n            <i class=\"icon-remove\"></i> Delete\n          </button>\n          <button class=\"btn\" ng-click=\"refresh()\"\n                  title=\"Refreshes the list of messages\">\n            <i class=\"icon-refresh\"></i>\n          </button>\n        </form>\n      </div>\n    </div>\n  </div>\n\n  <div class=\"row-fluid\">\n    <div class=\"gridStyle\" ng-grid=\"gridOptions\"></div>\n  </div>\n\n  <div hawtio-slideout=\"showMessageDetails\" title=\"{{row.JMSMessageID}}\">\n    <div class=\"dialog-body\">\n\n      <div class=\"row-fluid\">\n        <div class=\"pull-right\">\n          <form class=\"form-horizontal no-bottom-margin\">\n\n            <div class=\"btn-group\"\n                 hawtio-pager=\"messages\"\n                 on-index-change=\"selectRowIndex\"\n                 row-index=\"rowIndex\"></div>\n\n            <button class=\"btn\" ng-disabled=\"!gridOptions.selectedItems.length\" ng-click=\"moveDialog = true\"\n                    title=\"Move the selected messages to another destination\" data-placement=\"bottom\">\n              <i class=\"icon-share-alt\"></i> Move\n            </button>\n\n            <button class=\"btn btn-danger\" ng-disabled=\"!gridOptions.selectedItems.length\"\n                    ng-click=\"deleteDialog = true\"\n                    title=\"Delete the selected messages\">\n              <i class=\"icon-remove\"></i> Delete\n            </button>\n\n            <button class=\"btn\" ng-click=\"showMessageDetails = !showMessageDetails\" title=\"Close this dialog\">\n              <i class=\"icon-remove\"></i> Close\n            </button>\n\n          </form>\n        </div>\n      </div>\n\n      <div class=\"row-fluid\">\n        <div class=\"expandable closed\">\n          <div title=\"Headers\" class=\"title\">\n            <i class=\"expandable-indicator\"></i> Headers & Properties\n          </div>\n          <div class=\"expandable-body well\">\n            <table class=\"table table-condensed table-striped\">\n              <thead>\n              <tr>\n                <th>Header</th>\n                <th>Value</th>\n              </tr>\n              </thead>\n              <tbody ng-bind-html-unsafe=\"row.headerHtml\">\n              </tbody>\n              <!--\n                            <tr ng-repeat=\"(key, value) in row.headers\">\n                              <td class=\"property-name\">{{key}}</td>\n                              <td class=\"property-value\">{{value}}</td>\n                            </tr>\n              -->\n            </table>\n          </div>\n        </div>\n      </div>\n\n      <div class=\"row-fluid\">\n        <div>Displaying body as <span ng-bind=\"row.textMode\"></span></div>\n        <div hawtio-editor=\"row.bodyText\" read-only=\"true\" mode=\'mode\'></div>\n      </div>\n\n    </div>\n  </div>\n\n  <div hawtio-confirm-dialog=\"deleteDialog\"\n       ok-button-text=\"Delete\"\n       on-ok=\"deleteMessages()\">\n    <div class=\"dialog-body\">\n      <p>You are about to delete\n        <ng-pluralize count=\"gridOptions.selectedItems.length\"\n                      when=\"{\'1\': \'a message!\', \'other\': \'{} messages!\'}\">\n        </ng-pluralize>\n      </p>\n      <p>This operation cannot be undone so please be careful.</p>\n    </div>\n  </div>\n\n  <div hawtio-confirm-dialog=\"moveDialog\"\n       ok-button-text=\"Move\"\n       on-ok=\"moveMessages()\">\n    <div class=\"dialog-body\">\n      <p>Move\n        <ng-pluralize count=\"gridOptions.selectedItems.length\"\n                      when=\"{\'1\': \'message\', \'other\': \'{} messages\'}\"></ng-pluralize>\n        to: <input type=\"text\" ng-model=\"queueName\" placeholder=\"Queue name\"\n                   typeahead=\"title.unescapeHTML() for title in queueNames($viewValue) | filter:$viewValue\" typeahead-editable=\'true\'></p>\n      <p>\n        You cannot undo this operation.<br>\n        Though after the move you can always move the\n        <ng-pluralize count=\"gridOptions.selectedItems.length\"\n                      when=\"{\'1\': \'message\', \'other\': \'messages\'}\"></ng-pluralize>\n        back again.\n      </p>\n    </div>\n  </div>\n\n</div>\n\n");
$templateCache.put("plugins/activemq/html/createDestination.html","<form class=\"form-horizontal\" ng-controller=\"ActiveMQ.DestinationController\">\n  <fieldset>\n    <div class=\"control-group\">\n      <label class=\"pull-left\" style=\"margin-top:5px;\"> {{destinationTypeName}} name:</label>\n      <input class=\"span10 pull-left\"  type=\"text\" size=\"60\" style=\"margin-left:15px;\" maxlength=\"300\" name=\"destinationName\" ng-model=\"destinationName\" placeholder=\"{{destinationTypeName}} name\"/>\n    </div>\n    <div class=\"alert alert-warning\">\n        The JMS API does not define a standard address syntax. Although a standard address syntax was considered, it was decided that the differences in address semantics between existing message-oriented middleware (MOM) products were too wide to bridge with a single syntax.\n    </div>\n\n    <div class=\"control-group\">\n      <label class=\"checkbox\">\n        <input type=\"radio\" ng-model=\"queueType\" value=\"true\"> Queue\n      </label>\n      <label class=\"checkbox\">\n        <input type=\"radio\" ng-model=\"queueType\" value=\"\"> Topic\n      </label>\n    </div>\n\n    <div class=\"control-group\">\n      <button type=\"submit\" class=\"btn btn-info\" ng-click=\"createDestination(destinationName, queueType)\"\n              ng-disabled=\"!destinationName\">Create {{destinationTypeName}}\n      </button>\n    </div>\n  </fieldset>\n</form>\n");
$templateCache.put("plugins/activemq/html/createQueue.html","<form class=\"form-horizontal\" ng-controller=\"ActiveMQ.DestinationController\">\n    <div class=\"control-group\">\n        <label class=\"pull-left\" style=\"margin-top:5px;\"> Queue name:</label>\n        <input class=\"span10 pull-left\"  type=\"text\" size=\"60\" style=\"margin-left:15px;\" maxlength=\"300\" name=\"destinationName\" ng-model=\"destinationName\" placeholder=\"Queue name\"/>\n    </div>\n    <div class=\"alert alert-warning\">\n        The JMS API does not define a standard address syntax. Although a standard address syntax was considered, it was decided that the differences in address semantics between existing message-oriented middleware (MOM) products were too wide to bridge with a single syntax.\n    </div>\n\n    <div class=\"control-group\">\n        <button type=\"submit\" class=\"btn btn-info\" ng-click=\"createDestination(destinationName, true)\" ng-disabled=\"!destinationName\">Create queue</button>\n    </div>\n</form>\n");
$templateCache.put("plugins/activemq/html/createTopic.html","<form class=\"form-horizontal\" ng-controller=\"ActiveMQ.DestinationController\">\n    <div class=\"control-group\">\n        <label class=\"pull-left\" style=\"margin-top:5px;\"> Topic name:</label>\n        <input class=\"span10 pull-left\"  type=\"text\" size=\"60\" style=\"margin-left:15px;\" maxlength=\"300\" name=\"destinationName\" ng-model=\"destinationName\" placeholder=\"Topic name\"/>\n    </div>\n    <div class=\"alert alert-warning\">\n        The JMS API does not define a standard address syntax. Although a standard address syntax was considered, it was decided that the differences in address semantics between existing message-oriented middleware (MOM) products were too wide to bridge with a single syntax.\n    </div>\n\n    <div class=\"control-group\">\n        <button type=\"submit\" class=\"btn btn-info\" ng-click=\"createDestination(destinationName, false)\" ng-disabled=\"!destinationName\">Create topic</button>\n    </div>\n</form>\n");
$templateCache.put("plugins/activemq/html/deleteQueue.html","<div ng-controller=\"ActiveMQ.DestinationController\">\n  <div class=\"row-fluid\">\n\n    <div class=\"control-group\">\n      <div class=\"alert\">\n        <button type=\"button\" class=\"close\" data-dismiss=\"alert\">×</button>\n        <strong>Warning:</strong> these operations cannot be undone. Please be careful!\n      </div>\n    </div>\n  </div>\n  <div class=\"row-fluid\">\n    <div class=\"span4\">\n      <div class=\"control-group\">\n        <button type=\"submit\" class=\"btn btn-warning\" ng-click=\"deleteDialog = true\">Delete queue \'{{name().unescapeHTML()}}\'</button>\n        <label>This will remove the queue completely.</label>\n      </div>\n    </div>\n    <div class=\"span4\">\n      <div class=\"control-group\">\n        <button type=\"submit\" class=\"btn btn-warning\" ng-click=\"purgeDialog = true\">Purge queue \'{{name().unescapeHTML()}}\'</button>\n        <label>Purges all the current messages on the queue.</label>\n      </div>\n    </div>\n  </div>\n\n  <div hawtio-confirm-dialog=\"deleteDialog\"\n       ok-button-text=\"Delete\"\n       on-ok=\"deleteDestination()\">\n    <div class=\"dialog-body\">\n      <p>You are about to delete the <b>{{name().unescapeHTML()}}</b> queue</p>\n      <p>This operation cannot be undone so please be careful.</p>\n    </div>\n  </div>\n\n  <div hawtio-confirm-dialog=\"purgeDialog\"\n       ok-button-text=\"Purge\"\n       on-ok=\"purgeDestination()\">\n    <div class=\"dialog-body\">\n      <p>You are about to purge the <b>{{name().unescapeHTML()}}</b> queue</p>\n      <p>This operation cannot be undone so please be careful.</p>\n    </div>\n  </div>\n\n\n</div>\n");
$templateCache.put("plugins/activemq/html/deleteTopic.html","<form class=\"form-horizontal\" ng-controller=\"ActiveMQ.DestinationController\">\n    <div class=\"control-group\">\n        <div class=\"alert\">\n          <button type=\"button\" class=\"close\" data-dismiss=\"alert\">×</button>\n          <strong>Warning!</strong> You are about to delete topic \'{{name()}}\'.\n          <br/>\n          This operation cannot be undone!\n        </div>\n    </div>\n    <div class=\"control-group\">\n        <button type=\"submit\" class=\"btn btn-warning\" ng-click=\"deleteDestination()\">Delete topic \'{{name()}}\'</button>\n    </div>\n</form>\n");
$templateCache.put("plugins/activemq/html/durableSubscribers.html","<div ng-controller=\"ActiveMQ.DurableSubscriberController\">\n\n    <div class=\"row-fluid\">\n      <div class=\"span12\">\n        <div class=\"pull-right\">\n            <form class=\"form-inline\">\n                <button class=\"btn\" ng-click=\"createSubscriberDialog.open()\"\n                        hawtio-show object-name=\"{{workspace.selection.objectName}}\" method-name=\"createDurableSubscriber\"\n                        title=\"Create durable subscriber\">\n                    <i class=\"icon-plus\"></i> Create\n                </button>\n                <button class=\"btn\" ng-click=\"deleteSubscriberDialog.open()\"\n                        hawtio-show object-name=\"{{$scope.gridOptions.selectedItems[0]._id}}\" method-name=\"destroy\"\n                        title=\"Destroy durable subscriber\" ng-disabled=\"gridOptions.selectedItems.length != 1\">\n                    <i class=\"icon-exclamation\"></i> Destroy\n                </button>\n                <button class=\"btn\" ng-click=\"refresh()\"\n                        title=\"Refreshes the list of subscribers\">\n                    <i class=\"icon-refresh\"></i>\n                </button>\n            </form>\n        </div>\n      </div>\n    </div>\n\n    <div class=\"row-fluid\">\n      <div class=\"gridStyle\" ng-grid=\"gridOptions\"></div>\n    </div>\n\n    <div modal=\"createSubscriberDialog.show\">\n      <form name=\"createSubscriber\" class=\"form-horizontal no-bottom-margin\" ng-submit=\"doCreateSubscriber(clientId, subscriberName, topicName, subSelector)\">\n        <div class=\"modal-header\"><h4>Create Durable Subscriber</h4></div>\n        <div class=\"modal-body\">\n          <label>Client Id: </label>\n          <input name=\"clientId\" class=\"input-xlarge\" type=\"text\" ng-model=\"clientId\" required>\n          <label>Subscriber name: </label>\n          <input name=\"subscriberName\" class=\"input-xlarge\" type=\"text\" ng-model=\"subscriberName\" required>\n          <label>Topic name: </label>\n          <input name=\"topicName\" class=\"input-xlarge\" type=\"text\" ng-model=\"topicName\" required typeahead=\"title for title in topicNames($viewValue) | filter:$viewValue\" typeahead-editable=\'true\'>\n          <label>Selector: </label>\n          <input name=\"subSelector\" class=\"input-xlarge\" type=\"text\" ng-model=\"subSelector\">\n        </div>\n        <div class=\"modal-footer\">\n          <input class=\"btn btn-success\" type=\"submit\" value=\"Create\">\n          <input class=\"btn btn-primary\" type=\"button\" ng-click=\"createSubscriberDialog.close()\" value=\"Cancel\">\n        </div>\n      </form>\n    </div>\n\n    <div hawtio-slideout=\"showSubscriberDialog.show\" title=\"Details\">\n      <div class=\"dialog-body\">\n\n        <div class=\"row-fluid\">\n          <div class=\"pull-right\">\n            <form class=\"form-inline\">\n\n              <button class=\"btn btn-danger\" ng-disabled=\"showSubscriberDialog.subscriber.Status == \'Active\'\"\n                      ng-click=\"deleteSubscriberDialog.open()\"\n                      title=\"Delete subscriber\">\n                <i class=\"icon-remove\"></i> Delete\n              </button>\n\n              <button class=\"btn\" ng-click=\"showSubscriberDialog.close()\" title=\"Close this dialog\">\n                <i class=\"icon-remove\"></i> Close\n              </button>\n\n            </form>\n          </div>\n        </div>\n\n          <div class=\"row-fluid\">\n              <div class=\"expandable-body well\">\n                <table class=\"table table-condensed table-striped\">\n                  <thead>\n                  <tr>\n                    <th>Property</th>\n                    <th>Value</th>\n                  </tr>\n                  </thead>\n                  <tbody>\n                  <tr>\n                    <td class=\"property-name\">Client Id</td>\n                    <td class=\"property-value\">{{showSubscriberDialog.subscriber[\"ClientId\"]}}</td>\n                  </tr>\n                  <tr>\n                    <td class=\"property-name\">Subscription Name</td>\n                    <td class=\"property-value\">{{showSubscriberDialog.subscriber[\"SubscriptionName\"]}}</td>\n                  </tr>\n                  <tr>\n                    <td class=\"property-name\">Topic Name</td>\n                    <td class=\"property-value\">{{showSubscriberDialog.subscriber[\"DestinationName\"]}}</td>\n                  </tr>\n                  <tr>\n                    <td class=\"property-name\">Selector</td>\n                    <td class=\"property-value\">{{showSubscriberDialog.subscriber[\"Selector\"]}}</td>\n                  </tr>\n                  <tr>\n                    <td class=\"property-name\">Status</td>\n                    <td class=\"property-value\">{{showSubscriberDialog.subscriber.Status}}</td>\n                  </tr>\n                  <tr>\n                    <td class=\"property-name\">Enqueue Counter</td>\n                    <td class=\"property-value\">{{showSubscriberDialog.subscriber[\"EnqueueCounter\"]}}</td>\n                  </tr>\n                  <tr>\n                    <td class=\"property-name\">Dequeue Counter</td>\n                    <td class=\"property-value\">{{showSubscriberDialog.subscriber[\"DequeueCounter\"]}}</td>\n                  </tr>\n                  <tr>\n                    <td class=\"property-name\">Dispatched Counter</td>\n                    <td class=\"property-value\">{{showSubscriberDialog.subscriber[\"DispatchedCounter\"]}}</td>\n                  </tr>\n                  <tr>\n                    <td class=\"property-name\">Pending Size</td>\n                    <td class=\"property-value\">{{showSubscriberDialog.subscriber[\"PendingQueueSize\"]}}</td>\n                  </tr>\n                  </tbody>\n                </table>\n              </div>\n            </div>\n\n      </div>\n\n    </div>\n\n    <div hawtio-confirm-dialog=\"deleteSubscriberDialog.show\" ok-button-text=\"Yes\" cancel-button-text=\"No\" on-ok=\"deleteSubscribers()\">\n      <div class=\"dialog-body\">\n        <p>Are you sure you want to delete the subscriber</p>\n      </div>\n    </div>\n\n</div>");
$templateCache.put("plugins/activemq/html/jobs.html","<div ng-controller=\"ActiveMQ.JobSchedulerController\">\n\n    <div class=\"row-fluid\">\n      <div class=\"span12\">\n        <div class=\"pull-right\">\n            <form class=\"form-inline\">\n                <button class=\"btn\" ng-disabled=\"!gridOptions.selectedItems.length\"\n                        hawtio-show object-name=\"{{workspace.selection.objectName}}\" method-name=\"removeJob\"\n                        ng-click=\"deleteJobsDialog.open()\"\n                        title=\"Delete the selected jobs\">\n                  <i class=\"icon-remove\"></i> Delete\n                </button>\n                <button class=\"btn\" ng-click=\"refresh()\"\n                        title=\"Refreshes the list of subscribers\">\n                    <i class=\"icon-refresh\"></i>\n                </button>\n            </form>\n        </div>\n      </div>\n    </div>\n\n    <div class=\"row-fluid\">\n      <div class=\"gridStyle\" ng-grid=\"gridOptions\"></div>\n    </div>\n\n    <div hawtio-confirm-dialog=\"deleteJobsDialog.show\" ok-button-text=\"Yes\" cancel-button-text=\"No\" on-ok=\"deleteJobs()\">\n      <div class=\"dialog-body\">\n        <p>Are you sure you want to delete the jobs</p>\n      </div>\n    </div>\n\n</div>");
$templateCache.put("plugins/activemq/html/layoutActiveMQTree.html","<script type=\"text/ng-template\" id=\"header\">\n  <div class=\"tree-header\" ng-controller=\"ActiveMQ.TreeHeaderController\">\n    <div class=\"left\">\n    </div>\n    <div class=\"right\">\n      <i class=\"icon-chevron-down clickable\"\n         title=\"Expand all nodes\"\n         ng-click=\"expandAll()\"></i>\n      <i class=\"icon-chevron-up clickable\"\n         title=\"Unexpand all nodes\"\n         ng-click=\"contractAll()\"></i>\n    </div>\n  </div>\n</script>\n\n<hawtio-pane position=\"left\" width=\"300\" header=\"header\">\n  <div id=\"tree-container\"\n       ng-controller=\"Jmx.MBeansController\">\n    <div id=\"activemqtree\"\n         ng-controller=\"ActiveMQ.TreeController\"></div>\n  </div>\n</hawtio-pane>\n<div class=\"row-fluid\">\n  <ng-include src=\"\'app/jmx/html/subLevelTabs.html\'\"></ng-include>\n  <div id=\"properties\" ng-view></div>\n</div>\n");
$templateCache.put("plugins/activemq/html/preferences.html","<div ng-controller=\"ActiveMQ.PreferencesController\">\n  <form class=\"form-horizontal\">\n    <div class=\"control-group\">\n      <label class=\"control-label\" for=\"activemqUserName\"\n             title=\"The user name to be used when connecting to the broker\">User name</label>\n\n      <div class=\"controls\">\n        <input id=\"activemqUserName\" type=\"text\" placeholder=\"username\" ng-model=\"activemqUserName\" autofill/>\n      </div>\n    </div>\n    <div class=\"control-group\">\n      <label class=\"control-label\" for=\"activemqPassword\" title=\"Password to be used when connecting to the broker\">Password</label>\n\n      <div class=\"controls\">\n        <input id=\"activemqPassword\" type=\"password\" placeholder=\"password\" ng-model=\"activemqPassword\" autofill/>\n      </div>\n    </div>\n\n    <div class=\"control-group\">\n      <label class=\"control-label\">Filter advisory topics</label>\n\n      <div class=\"controls\">\n        <input type=\"checkbox\" ng-model=\"activemqFilterAdvisoryTopics\">\n        <span class=\"help-block\">Whether to exclude advisory topics in tree/table</span>\n      </div>\n\n    </div>\n\n    <div class=\"control-group\">\n      <label class=\"control-label\" for=\"byteMessages\">Browse byte messages</label>\n\n      <div class=\"controls\">\n        <select id=\"byteMessages\" ng-model=\"activemqBrowseBytesMessages\">\n          <option value=\'99\'>Off</option>\n          <option value=\'8\'>Decimal</option>\n          <option value=\'4\'>Hex</option>\n          <option value=\'2\'>Decimal and text</option>\n          <option value=\'1\'>Hex and text</option>\n        </select>\n        <span class=\"help-block\">Browsing byte messages should display the message body as</span>\n      </div>\n    </div>\n\n  </form>\n</div>\n");
$templateCache.put("plugins/camel/html/attributeToolBarContext.html","<div class=\"row-fluid\">\n  <div class=\"span6\" ng-controller=\"Camel.AttributesToolBarController\">\n    <div class=\"control-group\">\n      <button class=\"btn\" ng-disabled=\"!anySelectionHasState([\'stop\', \'suspend\'])\" ng-click=\"start()\"><i\n              class=\"icon-play-circle\"></i> Start\n      </button>\n      <button class=\"btn\" ng-disabled=\"!anySelectionHasState(\'start\')\" ng-click=\"pause()\"><i class=\"icon-pause\"></i>\n        Pause\n      </button>\n      <button class=\"btn\" ng-disabled=\"!anySelectionHasState([\'start\', \'suspend\'])\" ng-click=\"deleteDialog = true\"><i\n              class=\"icon-remove\"></i> Destroy\n      </button>\n    </div>\n\n    <div hawtio-confirm-dialog=\"deleteDialog\"\n         ok-button-text=\"Delete\"\n         on-ok=\"stop()\">\n      <div class=\"dialog-body\">\n        <p>You are about to delete this Camel Context.</p>\n        <p>This operation cannot be undone so please be careful.</p>\n      </div>\n    </div>\n\n  </div>\n  <div class=\"span6\">\n    <div class=\"control-group\">\n      <input class=\"span12 search-query\" type=\"text\" ng-model=\"$parent.gridOptions.filterOptions.filterText\" placeholder=\"Filter...\">\n    </div>\n  </div>\n</div>\n");
$templateCache.put("plugins/camel/html/attributeToolBarRoutes.html","<div class=\"row-fluid\">\n  <div class=\"span6\">\n    <div class=\"control-group\"  ng-controller=\"Camel.AttributesToolBarController\">\n      <button class=\"btn\" ng-disabled=\"!anySelectionHasState([\'stop\', \'suspend\'])\" ng-click=\"start()\"><i class=\"icon-play-circle\"></i> Start</button>\n      <button class=\"btn\" ng-disabled=\"!anySelectionHasState(\'start\')\" ng-click=\"pause()\"><i class=\"icon-pause\"></i> Pause</button>\n      <button class=\"btn\" ng-disabled=\"!anySelectionHasState([\'start\', \'suspend\'])\" ng-click=\"stop()\"><i class=\"icon-off\"></i> Stop</button>\n      <button class=\"btn\" ng-disabled=\"!everySelectionHasState(\'stop\')\" ng-click=\"delete()\"><i class=\"icon-remove\"></i> Delete</button>\n    </div>\n  </div>\n  <div class=\"span6\">\n    <div class=\"control-group\">\n      <input type=\"text\" class=\"span12 search-query\" ng-model=\"$parent.gridOptions.filterOptions.filterText\" placeholder=\"Filter...\">\n    </div>\n  </div>\n</div>\n");
$templateCache.put("plugins/camel/html/breadcrumbBar.html","<div ng-hide=\"inDashboard\" class=\"logbar logbar-wiki\" ng-controller=\"Camel.BreadcrumbBarController\">\n  <div class=\"wiki logbar-container\">\n    <ul class=\"nav nav-tabs\">\n      <li class=\"\" >\n        <a class=\"breadcrumb-link\">\n          <span class=\"contained c-medium\">Camel Contexts</span>\n        </a>\n      </li>\n        <li class=\"dropdown\" ng-repeat=\"breadcrumb in breadcrumbs\">\n          <a ng-show=\"breadcrumb.items.length > 0\" href=\"#\" class=\"breadcrumb-link dropdown-toggle\" data-toggle=\"dropdown\"\n             data-placement=\"bottom\" title=\"{{breadcrumb.tooltip}}\">\n            {{breadcrumb.name}}\n            <span class=\"caret\"></span>\n          </a>\n          <ul class=\"dropdown-menu\">\n            <li ng-repeat=\"item in breadcrumb.items\">\n              <a ng-href=\"{{item.link}}{{hash}}\"\n                 title=\"Switch to {{item.name}} \"\n                 data-placement=\"bottom\">\n                {{item.name}}</a>\n            </li>\n          </ul>\n        </li>\n      <li class=\"pull-right\" ng-show=\"treeViewLink\" title=\"Switch to the tree based explorer view\">\n        <a href=\"{{treeViewLink}}\"><i class=\"icon-resize-full\"></i></a>\n      </li>\n      </ul>\n  </div>\n</div>\n");
$templateCache.put("plugins/camel/html/browseEndpoint.html","<div ng-controller=\"Camel.BrowseEndpointController\">\n  <div ng-hide=\"isJmxTab\">\n    <ng-include src=\"\'app/camel/html/breadcrumbBar.html\'\"></ng-include>\n  </div>\n  <div ng-class=\"{\'wiki-fixed\' : !isJmxTab}\">\n    <div class=\"row-fluid\">\n      <div class=\"span6\">\n        <input class=\"search-query span12\" type=\"text\" ng-model=\"gridOptions.filterOptions.filterText\"\n               placeholder=\"Filter messages\">\n      </div>\n      <div class=\"span6\">\n        <div class=\"pull-right\">\n          <form class=\"form-inline\">\n            <button class=\"btn\" ng-disabled=\"!gridOptions.selectedItems.length\" ng-click=\"forwardDialog.open()\"\n                    hawtio-show object-name=\"{{workspace.selection.objectName}}\" method-name=\"sendBodyAndHeaders\"\n                    title=\"Forward the selected messages to another endpoint\" data-placement=\"bottom\">\n              <i class=\"icon-forward\"></i> Forward\n            </button>\n            <button class=\"btn\" ng-click=\"refresh()\"\n                    title=\"Refreshes the list of messages\">\n              <i class=\"icon-refresh\"></i>\n            </button>\n          </form>\n        </div>\n      </div>\n    </div>\n\n\n    <div class=\"row-fluid\">\n      <div class=\"gridStyle\" ng-grid=\"gridOptions\"></div>\n    </div>\n\n    <div hawtio-slideout=\"showMessageDetails\" title=\"{{row.id}}\">\n      <div class=\"dialog-body\">\n\n        <div class=\"row-fluid\">\n          <div class=\"pull-right\">\n            <form class=\"form-horizontal no-bottom-margin\">\n              <div class=\"btn-group\" hawtio-pager=\"messages\" on-index-change=\"selectRowIndex\"\n                   row-index=\"rowIndex\"></div>\n              <button class=\"btn\" ng-disabled=\"!gridOptions.selectedItems.length\" ng-click=\"forwardDialog.open()\"\n                      hawtio-show object-name=\"{{workspace.selection.objectName}}\" method-name=\"sendBodyAndHeaders\"\n                      title=\"Forward the selected messages to another endpoint\" data-placement=\"bottom\">\n                <i class=\"icon-forward\"></i> Forward\n              </button>\n              <button class=\"btn\" ng-click=\"showMessageDetails = !showMessageDetails\" title=\"Close this dialog\">\n                <i class=\"icon-remove\"></i> Close\n              </button>\n            </form>\n          </div>\n        </div>\n\n        <div class=\"row-fluid\">\n          <div class=\"expandable closed\">\n            <div title=\"Headers\" class=\"title\">\n              <i class=\"expandable-indicator\"></i> Headers\n            </div>\n            <div class=\"expandable-body well\">\n              <table class=\"table table-condensed table-striped\">\n                <thead>\n                <tr>\n                  <th>Header</th>\n                  <th>Value</th>\n                </tr>\n                </thead>\n                <tbody ng-bind-html-unsafe=\"row.headerHtml\">\n                </tbody>\n              </table>\n            </div>\n          </div>\n\n          <div class=\"row-fluid\">\n            <div hawtio-editor=\"row.body\" read-only=\"true\" mode=\"mode\"></div>\n          </div>\n\n        </div>\n\n      </div>\n    </div>\n  </div>\n\n  <div modal=\"forwardDialog.show\" close=\"forwardDialog.close()\" options=\"forwardDialog.options\">\n    <form class=\"form-horizontal no-bottom-margin\" ng-submit=\"forwardDialog.close()\">\n      <div class=\"modal-header\">\n        <h4>Forward\n          <ng-pluralize count=\"selectedItems.length\"\n                        when=\"{\'1\': \'a message\', \'other\': \'messages\'}\"></ng-pluralize>\n        </h4>\n      </div>\n      <div class=\"modal-body\">\n        <p>Forward\n          <ng-pluralize count=\"selectedItems.length\"\n                        when=\"{\'1\': \'a message\', \'other\': \'{} messages\'}\"></ng-pluralize>\n          to: <input type=\"text\" style=\"width: 100%\" ng-model=\"endpointUri\" placeholder=\"Endpoint URI\"\n                     typeahead=\"title for title in endpointUris() | filter:$viewValue\" typeahead-editable=\'true\'></p>\n      </div>\n      <div class=\"modal-footer\">\n        <input id=\"submit\" class=\"btn btn-primary add\" type=\"submit\" ng-click=\"forwardMessagesAndCloseForwardDialog()\"\n               value=\"Forward\">\n        <button class=\"btn btn-warning cancel\" type=\"button\" ng-click=\"forwardDialog.close()\">Cancel</button>\n      </div>\n    </form>\n  </div>\n</div>\n");
$templateCache.put("plugins/camel/html/browseMessages.html","<div ng-switch=\"messageDialog.show\">\n  <div ng-switch-when=\"false\">\n    <div class=\"row-fluid\">\n      <div class=\"gridStyle\" ng-grid=\"gridOptions\"></div>\n      <!--\n          <div class=\"gridStyle\" hawtio-datatable=\"gridOptions\"></div>\n      -->\n    </div>\n  </div>\n  <div ng-switch-when=\"true\">\n    <div class=\"row-fluid\">\n      <div class=\"span8\">\n        <h4>{{row.id}}</h4>\n      </div>\n      <div class=\"pull-right\">\n        <form class=\"form-horizontal no-bottom-margin\">\n          <div class=\"btn-group\" hawtio-pager=\"messages\" on-index-change=\"selectRowIndex\" row-index=\"rowIndex\"></div>\n          <button class=\"btn\" ng-click=\"messageDialog.close()\" title=\"Closes the message detail view\">\n            <i class=\"icon-eject\"></i></button>\n        </form>\n      </div>\n    </div>\n    <div class=\"row-fluid\">\n      <div class=\"expandable closed\">\n        <div title=\"Headers\" class=\"title\">\n          <i class=\"expandable-indicator\"></i> Headers\n        </div>\n        <div class=\"expandable-body well\">\n          <table class=\"table table-condensed table-striped\">\n            <thead>\n            <tr>\n              <th>Header</th>\n              <th>Type</th>\n              <th>Value</th>\n            </tr>\n            </thead>\n            <tbody ng-bind-html-unsafe=\"row.headerHtml\">\n            </tbody>\n          </table>\n        </div>\n      </div>\n\n      <div class=\"row-fluid\">\n        <div title=\"Body\" class=\"title\">\n          Body (type: {{row.bodyType}})\n        </div>\n        <div hawtio-editor=\"row.body\" read-only=\"true\" mode=\"mode\" text-title=\"row.bodyType\"></div>\n      </div>\n\n    </div>\n  </div>\n</div>\n");
$templateCache.put("plugins/camel/html/browseRoute.html","<ng-include src=\"\'app/camel/html/browseMessageTemplate.html\'\"></ng-include>\n\n<div class=\"row-fluid\">\n  <div class=\"gridStyle\" ng-grid=\"gridOptions\"></div>\n  <!--\n      <div class=\"gridStyle\" hawtio-datatable=\"gridOptions\"></div>\n  -->\n</div>");
$templateCache.put("plugins/camel/html/createEndpoint.html","<div ng-controller=\"Camel.EndpointController\" ng-switch=\"hasComponentNames\">\n  <div ng-switch-when=\"true\">\n    <tabs>\n      <pane heading=\"URL\">\n        <ng-include src=\"\'app/camel/html/createEndpointURL.html\'\"></ng-include>\n      </pane>\n      <pane heading=\"Components\">\n        <ng-include src=\"\'app/camel/html/createEndpointWizard.html\'\"></ng-include>\n      </pane>\n    </tabs>\n  </div>\n  <div ng-switch-default=\"false\">\n    <ng-include src=\"\'app/camel/html/createEndpointURL.html\'\"></ng-include>\n  </div>\n</div>\n");
$templateCache.put("plugins/camel/html/createEndpointURL.html","<form class=\"form-horizontal\">\n  <div class=\"control-group\">\n    <input class=\"span12\" type=\"text\" size=\"255\" ng-model=\"endpointName\" placeholder=\"Endpoint URI\"/>\n  </div>\n  <div class=\"control-group\">\n    <button type=\"submit\" class=\"btn btn-info\" ng-click=\"createEndpoint(endpointName)\"\n            ng-disabled=\"!endpointName\">\n      Create endpoint\n    </button>\n  </div>\n</form>\n");
$templateCache.put("plugins/camel/html/createEndpointWizard.html","<div ng-controller=\"Camel.EndpointController\">\n  <form class=\"form-horizontal\">\n    <div class=\"control-group\">\n      <label class=\"control-label\" for=\"componentName\">Component</label>\n\n      <div class=\"controls\">\n        <select id=\"componentName\" ng-model=\"selectedComponentName\"\n                ng-options=\"componentName for componentName in componentNames\"></select>\n      </div>\n    </div>\n    <div ng-show=\"selectedComponentName\">\n      <div class=\"control-group\">\n        <label class=\"control-label\" for=\"endpointPath\">Endpoint</label>\n\n        <div class=\"controls\">\n          <input id=\"endpointPath\" class=\"span10\" type=\"text\" ng-model=\"endpointPath\" placeholder=\"name\"\n                 typeahead=\"title for title in endpointCompletions($viewValue) | filter:$viewValue\" typeahead-editable=\'true\'\n                 min-length=\"1\">\n        </div>\n      </div>\n\n      <div simple-form name=\"formEditor\" entity=\'endpointParameters\' data=\'endpointSchema\' schema=\"schema\"></div>\n\n      <div class=\"control-group\">\n        <div class=\"controls\">\n          <button type=\"submit\" class=\"btn btn-info\" ng-click=\"createEndpointFromData()\"\n                  ng-disabled=\"!endpointPath || !selectedComponentName\">\n            Create endpoint\n          </button>\n        </div>\n      </div>\n    </div>\n  </form>\n</div>\n");
$templateCache.put("plugins/camel/html/debug.html","<div ng-controller=\"Camel.DebugRouteController\" ng-switch=\"debugging\">\n  <div ng-switch-when=\"true\">\n    <div class=\"row-fluid\">\n      <div class=\"span10\">\n        <div ng-include src=\"graphView\">\n        </div>\n      </div>\n      <div class=\"span2\">\n        <div class=\"btn-toolbar pull-right\">\n          <div class=\"btn-group\">\n            <div ng-switch=\"hasBreakpoint\">\n              <button ng-switch-when=\"true\" class=\"btn\" ng-disabled=\"!selectedDiagramNodeId\"\n                      ng-click=\"removeBreakpoint()\" title=\"Remove the breakpoint on the selected node\"><i\n                      class=\"icon-remove\"></i>\n              </button>\n              <button ng-switch-default=\"false\" class=\"btn\" ng-disabled=\"!selectedDiagramNodeId\"\n                      ng-click=\"addBreakpoint()\" title=\"Add a breakpoint on the selected node\"><i class=\"icon-plus\"></i>\n              </button>\n            </div>\n          </div>\n          <div class=\"btn-group\">\n            <button class=\"btn\" type=\"submit\" ng-click=\"stopDebugging()\" title=\"Stops the debugger\">Close\n            </button>\n          </div>\n        </div>\n        <div class=\"btn-toolbar pull-right\">\n          <div class=\"btn-group\">\n            <button class=\"btn\" ng-click=\"step()\" ng-disabled=\"!stopped\" title=\"Step into the next node\"><img\n                    ng-src=\"app/camel/doc/img/debug/step.gif\"></button>\n            <button class=\"btn\" ng-click=\"resume()\" ng-disabled=\"!stopped\" title=\"Resume running\"><img\n                    ng-src=\"app/camel/doc/img/debug/resume.gif\"></button>\n            <button class=\"btn\" ng-click=\"suspend()\" ng-disabled=\"stopped\"\n                    title=\"Suspend all threads in this route\"><img ng-src=\"app/camel/doc/img/debug/suspend.gif\"></button>\n          </div>\n        </div>\n        <div class=\"span12 well\">\n          <form>\n            <div class=\"table-header\">Breakpoints:</div>\n            <ul>\n              <li class=\"table-row\" ng-repeat=\"b in breakpoints\">\n                {{b}}\n              </li>\n            </ul>\n            <div class=\"table-row\">Suspended:</div>\n            <ul>\n              <li class=\"table-row\" ng-repeat=\"b in suspendedBreakpoints\">\n                {{b}}\n              </li>\n            </ul>\n          </form>\n        </div>\n      </div>\n    </div>\n\n    <div ng-include src=\"tableView\">\n    </div>\n  </div>\n  <div class=\"span12 well\" ng-switch-default=\"false\">\n    <form>\n      <p>Debugging allows you to step through camel routes to diagnose issues</p>\n\n      <button class=\"btn btn-info\" type=\"submit\" ng-click=\"startDebugging()\">Start debugging</button>\n    </form>\n  </div>\n</div>");
$templateCache.put("plugins/camel/html/fabricDiagram.html","<style type=\"text/css\">\n\n  .span5.node-panel {\n    margin-top: 5px;\n    margin-left: 5px;\n  }\n\n  .node-attributes dl {\n    margin-top: 5px;\n    margin-bottom: 10px;\n  }\n\n  .node-attributes dt {\n    width: 270px;\n  }\n\n  .node-attributes dd {\n    margin-left: 280px;\n  }\n\n  .node-attributes dd a {\n    /** lets make the destination links wrap */\n    -ms-word-break: break-all;\n    word-break: break-all;\n    -webkit-hyphens: auto;\n    -moz-hyphens: auto;\n    hyphens: auto;\n  }\n\n  ul.viewMenu li {\n    padding-left: 10px;\n    padding-top: 2px;\n    padding-bottom: 2px;\n  }\n\n  div#pop-up {\n    display: none;\n    position: absolute;\n    color: white;\n    font-size: 14px;\n    background: rgba(0, 0, 0, 0.6);\n    padding: 5px 10px 5px 10px;\n    -moz-border-radius: 8px 8px;\n    border-radius: 8px 8px;\n  }\n\n  div#pop-up-title {\n    font-size: 15px;\n    margin-bottom: 4px;\n    font-weight: bolder;\n  }\n\n  div#pop-up-content {\n    font-size: 12px;\n  }\n\n  rect.graphbox {\n    fill: #FFF;\n  }\n\n  rect.graphbox.frame {\n    stroke: #222;\n    stroke-width: 2px\n  }\n\n  /* only things directly related to the network graph should be here */\n\n  path.link {\n    fill: none;\n    stroke: #666;\n    stroke-width: 1.5px;\n  }\n\n  marker.context {\n    stroke: red;\n    fill: red;\n    stroke-width: 1.5px;\n  }\n\n  circle.context {\n    fill: #0c0;\n  }\n\n  circle.route {\n    fill: #c0c;\n    stroke-width: 1.3px;\n  }\n\n  circle.notActive {\n    fill: #c00;\n  }\n\n  path.link.group {\n    stroke: #ccc;\n  }\n\n  marker#group {\n    stroke: #ccc;\n    fill: #ccc;\n  }\n\n  circle.group {\n    fill: #eee;\n    stroke: #ccc;\n  }\n\n  circle.destination {\n    fill: #bbb;\n    stroke: #ccc;\n  }\n\n  circle.pinned {\n    stroke-width: 4.5px;\n  }\n\n  path.link.profile {\n    stroke-dasharray: 0, 2 1;\n    stroke: #888;\n  }\n\n  marker#container {\n  }\n\n  circle.container {\n    stroke-dasharray: 0, 2 1;\n    stroke: #888;\n  }\n\n  path.link.container {\n    stroke-dasharray: 0, 2 1;\n    stroke: #888;\n  }\n\n  circle {\n    fill: #ccc;\n    stroke: #333;\n    stroke-width: 1.5px;\n    cursor: pointer;\n  }\n\n  circle.closeMode {\n    cursor: crosshair;\n  }\n\n  path.link.destination {\n    stroke: #ccc;\n  }\n\n  circle.topic {\n    fill: #c0c;\n  }\n\n  circle.endpoint, circle.endpoints {\n    fill: #00c;\n  }\n\n  circle.selected {\n    stroke-width: 3px;\n  }\n\n  .selected {\n    stroke-width: 3px;\n  }\n\n  text {\n    font: 10px sans-serif;\n    pointer-events: none;\n  }\n\n  text.shadow {\n    stroke: #fff;\n    stroke-width: 3px;\n    stroke-opacity: .8;\n  }\n</style>\n\n\n<div class=\"row-fluid mq-page\" ng-controller=\"Camel.FabricDiagramController\">\n\n  <div ng-hide=\"inDashboard\" class=\"span12 page-padded\">\n    <div class=\"section-header\">\n\n      <div class=\"section-filter\">\n        <input type=\"text\" class=\"search-query\" placeholder=\"Filter...\" ng-model=\"searchFilter\">\n        <i class=\"icon-remove clickable\" title=\"Clear filter\" ng-click=\"searchFilter = \'\'\"></i>\n      </div>\n\n      <div class=\"section-controls\">\n        <a href=\"#\"\n           class=\"dropdown-toggle\"\n           data-toggle=\"dropdown\">\n          View &nbsp;<i class=\"icon-caret-down\"></i>\n        </a>\n\n        <ul class=\"dropdown-menu viewMenu\">\n          <!--\n                    <li>\n                      <label class=\"checkbox\">\n                        <input type=\"checkbox\" ng-model=\"viewSettings.consumer\"> Consumers\n                      </label>\n                    </li>\n                    <li>\n                      <label class=\"checkbox\">\n                        <input type=\"checkbox\" ng-model=\"viewSettings.producer\"> Producers\n                      </label>\n                    </li>\n          -->\n          <li>\n            <label class=\"checkbox\">\n              <input type=\"checkbox\" ng-model=\"viewSettings.endpoint\"> Endpoint\n            </label>\n          </li>\n          <li>\n            <label class=\"checkbox\">\n              <input type=\"checkbox\" ng-model=\"viewSettings.route\"> Route\n            </label>\n          </li>\n          <li>\n            <label class=\"checkbox\">\n              <input type=\"checkbox\" ng-model=\"viewSettings.context\"> Context\n            </label>\n          </li>\n          <!--\n                    <li>\n                      <label class=\"checkbox\">\n                        <input type=\"checkbox\" ng-model=\"viewSettings.profile\"> Profiles\n                      </label>\n                    </li>\n          -->\n          <li>\n            <label class=\"checkbox\">\n              <input type=\"checkbox\" ng-model=\"viewSettings.container\"> Containers\n            </label>\n          </li>\n          <li class=\"divider\"></li>\n          <li title=\"Should we show the details panel on the left\">\n            <label class=\"checkbox\">\n              <input type=\"checkbox\" ng-model=\"viewSettings.panel\"> Details panel\n            </label>\n          </li>\n          <li title=\"Show the summary popup as you hover over nodes\">\n            <label class=\"checkbox\">\n              <input type=\"checkbox\" ng-model=\"viewSettings.popup\"> Hover text\n            </label>\n          </li>\n          <li title=\"Show the labels next to nodes\">\n            <label class=\"checkbox\">\n              <input type=\"checkbox\" ng-model=\"viewSettings.label\"> Label\n            </label>\n          </li>\n        </ul>\n\n        <!--\n                <a ng-href=\"#/fabric/mq/contexts{{hash}}\" title=\"View the context and container diagram\">\n                  <i class=\"icon-edit\"></i> Configuration\n                </a>\n        -->\n      </div>\n    </div>\n  </div>\n\n\n  <div id=\"pop-up\">\n    <div id=\"pop-up-title\"></div>\n    <div id=\"pop-up-content\"></div>\n  </div>\n\n  <div class=\"row-fluid\">\n    <div ng-show=\"containerCount\">\n      <div class=\"{{viewSettings.panel ? \'span7\' : \'span12\'}} canvas context-canvas\">\n        <div hawtio-force-graph graph=\"graph\" selected-model=\"selectedNode\" link-distance=\"150\" charge=\"-600\"\n             nodesize=\"10\" marker-kind=\"marker-end\"\n             style=\"min-height: 800px\">\n        </div>\n      </div>\n      <div ng-show=\"viewSettings.panel\" class=\"span5 node-panel\">\n        <div ng-show=\"selectedNode\" class=\"node-attributes\">\n          <dl ng-repeat=\"property in selectedNodeProperties\" class=\"dl-horizontal\">\n            <dt title=\"{{property.key}}\">{{property.key}}:</dt>\n            <dd ng-bind-html-unsafe=\"property.value\"></dd>\n          </dl>\n        </div>\n      </div>\n    </div>\n    <div class=\"hero-unit\" ng-show=\"containerCount === 0 && isFmc\">\n      <p>There are currently no Camel routes running in this fabric</p>\n\n      <p>To try out the EIP browser try create one of the example <a\n              href=\"#/wiki/branch/{{versionId}}/view/fabric/profiles/example/quickstarts\">quickstarts</a></p>\n\n      <p>e.g. Try creating a container for:\n        <a class=\"btn btn-primary\"\n           href=\"#/fabric/containers/createContainer?profileIds=example-quickstarts-cbr&versionId={{versionId}}\">\n          Content Based Router Quickstart\n        </a>\n        <a class=\"btn btn-primary\"\n           href=\"#/fabric/containers/createContainer?profileIds=example-quickstarts-eip&versionId={{versionId}}\">\n          EIP Quickstart\n        </a>\n      </p>\n    </div>\n    <div class=\"hero-unit\" ng-show=\"containerCount === 0 && !isFmc\">\n      <p>There are currently no Camel routes running in this JVM</p>\n\n      <p>To try out the Camel diagram try create one more Camel routes</p>\n    </div>\n  </div>\n\n  <div ng-include=\"\'app/fabric/html/connectToContainerDialog.html\'\"></div>\n\n</div>\n\n\n");
$templateCache.put("plugins/camel/html/layoutCamelTree.html","\n<script type=\"text/ng-template\" id=\"header\">\n  <div class=\"camel tree-header\" ng-controller=\"Camel.TreeHeaderController\">\n    <div class=\"left\">\n      <div class=\"section-filter\">\n        <input id=\"camelContextIdFilter\"\n               class=\"search-query\"\n               type=\"text\"\n               ng-model=\"contextFilterText\"\n               title=\"filter camel context IDs\"\n               placeholder=\"Filter...\">\n        <i class=\"icon-remove clickable\"\n           title=\"Clear filter\"\n           ng-click=\"contextFilterText = \'\'\"></i>\n      </div>\n    </div>\n    <div class=\"right\">\n      <i class=\"icon-chevron-down clickable\"\n         title=\"Expand all nodes\"\n         ng-click=\"expandAll()\"></i>\n      <i class=\"icon-chevron-up clickable\"\n         title=\"Unexpand all nodes\"\n         ng-click=\"contractAll()\"></i>\n    </div>\n  </div>\n</script>\n\n<hawtio-pane position=\"left\" width=\"300\" header=\"header\">\n  <div id=\"tree-container\"\n       ng-controller=\"Jmx.MBeansController\">\n    <div class=\"camel-tree\"\n         ng-controller=\"Camel.TreeController\">\n      <div id=\"cameltree\"></div>\n    </div>\n  </div>\n</hawtio-pane>\n<div class=\"row-fluid\">\n  <ng-include src=\"\'app/jmx/html/subLevelTabs.html\'\"></ng-include>\n  <div id=\"properties\" ng-view></div>\n</div>\n");
$templateCache.put("plugins/camel/html/nodePropertiesEdit.html","<div simple-form name=\"formEditor\" entity=\'nodeData\' data=\'model\' schema=\"schema\"></div>\n");
$templateCache.put("plugins/camel/html/nodePropertiesView.html","<div simple-form name=\"formViewer\" mode=\'view\' entity=\'nodeData\' data=\'model\' schema=\"schema\"></div>\n");
$templateCache.put("plugins/camel/html/preferences.html","<div ng-controller=\"Camel.PreferencesController\">\n  <form class=\"form-horizontal\">\n\n    <label class=\"control-label\">Include Streams</label>\n    <div class=\"control-group\">\n      <div class=\"controls\">\n        <input type=\"checkbox\" ng-model=\"camelTraceOrDebugIncludeStreams\">\n        <span class=\"help-block\">Whether to include stream based message body when using the tracer and debugger</span>\n      </div>\n    </div>\n\n    <label class=\"control-label\">Maximum body length</label>\n    <div class=\"control-group\">\n      <div class=\"controls\">\n        <input type=\"number\" ng-model=\"camelMaximumTraceOrDebugBodyLength\" min=\"0\">\n        <span class=\"help-block\">The maximum length of the body before its clipped when using the tracer and debugger</span>\n      </div>\n    </div>\n\n    <label class=\"control-label\">Maximum label length</label>\n    <div class=\"control-group\">\n      <div class=\"controls\">\n        <input type=\"number\" ng-model=\"camelMaximumLabelWidth\" min=\"0\">\n        <span class=\"help-block\">The maximum length of a label in Camel diagrams before it is clipped</span>\n      </div>\n    </div>\n\n    <label class=\"control-label\">Do not use ID for label</label>\n    <div class=\"control-group\">\n      <div class=\"controls\">\n        <input type=\"checkbox\" ng-model=\"camelIgnoreIdForLabel\">\n        <span class=\"help-block\">If enabled then we will ignore the ID value when viewing a pattern in a Camel diagram; otherwise we will use the ID value as the label (the tooltip will show the actual detail)</span>\n      </div>\n    </div>\n\n    <label class=\"control-label\">Route Metrics maximum seconds</label>\n    <div class=\"control-group\">\n      <div class=\"controls\">\n        <input type=\"number\" ng-model=\"camelRouteMetricMaxSeconds\" min=\"1\" max=\"100\">\n        <span class=\"help-block\">The maximum value in seconds used by the route metrics duration and histogram charts</span>\n      </div>\n    </div>\n\n  </form>\n</div>\n");
$templateCache.put("plugins/camel/html/profileRoute.html","<div class=\"row-fluid\" ng-controller=\"Camel.ProfileRouteController\">\n\n    <div class=\"row-fluid\">\n        <div class=\"pull-right\">\n            <form class=\"form-inline no-bottom-margin\">\n                <fieldset>\n                    <div class=\"control-group inline-block\">\n                        <input type=\"text\" class=\"search-query\" placeholder=\"Filter...\" ng-model=\"gridOptions.filterOptions.filterText\">\n                    </div>\n                </fieldset>\n            </form>\n        </div>\n    </div>\n\n    <div class=\"row-fluid\" ng-show=\"data.length > 0\">\n        <div class=\"gridStyle\" ng-grid=\"gridOptions\"></div>\n    </div>\n    <div class=\"row-fluid\" ng-show=\"data.length == 0\">\n        Loading...\n    </div>\n\n</div>\n\n");
$templateCache.put("plugins/camel/html/properties.html","<div ng-controller=\"Camel.PropertiesController\">\n  <div ng-include=\"viewTemplate\"></div>\n</div>\n");
$templateCache.put("plugins/camel/html/restRegistry.html","<div class=\"row-fluid\" ng-controller=\"Camel.RestServiceController\">\n\n  <div ng-show=\"selectedMBean\">\n\n    <div class=\"row-fluid\" ng-show=\"data.length > 0\">\n      <div class=\"pull-right\">\n        <form class=\"form-inline no-bottom-margin\">\n          <fieldset>\n            <div class=\"control-group inline-block\">\n              <input type=\"text\" class=\"search-query\" placeholder=\"Filter...\"\n                     ng-model=\"gridOptions.filterOptions.filterText\">\n            </div>\n          </fieldset>\n        </form>\n      </div>\n    </div>\n\n    <div class=\"row-fluid\" ng-show=\"data.length > 0\">\n      <table class=\"table table-condensed table-striped\" hawtio-simple-table=\"gridOptions\"></table>\n    </div>\n    <div class=\"row-fluid well\" ng-show=\"data.length == 0\">\n      <form>\n        <p>There are no Rest Services registered in this CamelContext.</p>\n      </form>\n    </div>\n  </div>\n\n  <div ng-hide=\"selectedMBean\">\n    <i class=\"icon-spinner icon-spin centered\"></i>\n  </div>\n\n</div>\n\n");
$templateCache.put("plugins/camel/html/routeMetrics.html","<div class=\"row-fluid\" ng-controller=\"Camel.RouteMetricsController\">\n\n  <div class=\"row-fluid\">\n    <div class=\"pull-right\">\n      <form class=\"form-inline no-bottom-margin\">\n        <fieldset>\n          <div class=\"control-group inline-block\">\n            <input type=\"text\" class=\"search-query\" placeholder=\"Filter...\" ng-model=\"filterText\">\n          </div>\n        </fieldset>\n      </form>\n    </div>\n  </div>\n\n  <div class=\"row-fluid\" ng-show=\"!initDone\">\n    Loading...\n  </div>\n\n  <div class=\"span8 centered well\" ng-show=\"initDone && metricDivs.length === 0\">\n    <form>\n      This Camel context has no route metrics data.\n    </form>\n  </div>\n\n  <!-- div to contain the graphs -->\n  <div class=\"metricsWatcher container mainContent\">\n    <div id=\"{{metric.id}}\" class=\"row\" ng-repeat=\"metric in metricDivs track by $index\" style=\"{{filterByRoute(metric)}}\"></div>\n  </div>\n\n</div>\n\n");
$templateCache.put("plugins/camel/html/routes.html","<style>\n\n  #node-CLOSED rect {\n    stroke-width: 1px;\n    fill: #f88;\n  }\n\n  .node:hover,\n  .node > *:hover,\n  rect > *:hover {\n    cursor: pointer;\n    opacity: 0.6;\n  }\n\n  path.edge {\n    fill: none;\n    stroke: #666;\n    stroke-width: 3px;\n  }\n\n  .edge:hover {\n    cursor: pointer;\n    opacity: 0.4;\n  }\n\n  text.counter {\n    stroke: #080;\n  }\n</style>\n<div ng-class=\"{\'wiki-fixed\' : !isJmxTab}\" id=\"canvas\" ng-controller=\"Camel.RouteController\">\n  <div ng-hide=\"isJmxTab\">\n    <ng-include src=\"\'app/camel/html/breadcrumbBar.html\'\"></ng-include>\n  </div>\n  <svg class=\"camel-diagram\" width=0 height=0>\n    <defs>\n      <marker id=\"arrowhead\"\n              viewBox=\"0 0 10 10\"\n              refX=\"8\"\n              refY=\"5\"\n              markerUnits=\"strokeWidth\"\n              markerWidth=\"4\"\n              markerHeight=\"3\"\n              orient=\"auto\"\n              style=\"fill: #333\">\n        <path d=\"M 0 0 L 10 5 L 0 10 z\"></path>\n      </marker>\n\n      <filter id=\"drop-shadow\" width=\"300%\" height=\"300%\">\n        <feGaussianBlur in=\"SourceAlpha\" result=\"blur-out\" stdDeviation=\"19\"/>\n        <feOffset in=\"blur-out\" result=\"the-shadow\" dx=\"2\" dy=\"2\"/>\n        <feComponentTransfer xmlns=\"http://www.w3.org/2000/svg\">\n          <feFuncA type=\"linear\" slope=\"0.2\"/>\n        </feComponentTransfer>\n        <feMerge xmlns=\"http://www.w3.org/2000/svg\">\n          <feMergeNode/>\n          <feMergeNode in=\"SourceGraphic\"/>\n        </feMerge>\n      </filter>\n      <linearGradient id=\"rect-gradient\" x1=\"0%\" y1=\"0%\" x2=\"0%\" y2=\"100%\">\n        <stop offset=\"0%\" style=\"stop-color:rgb(254,254,255);stop-opacity:1\"/>\n        <stop offset=\"100%\" style=\"stop-color:rgb(247,247,255);stop-opacity:1\"/>\n      </linearGradient>\n      <linearGradient id=\"rect-select-gradient\" x1=\"0%\" y1=\"0%\" x2=\"0%\" y2=\"100%\">\n        <stop offset=\"0%\" style=\"stop-color: #ffffa0; stop-opacity: 0.7\"/>\n        <stop offset=\"100%\" style=\"stop-color: #f0f0a0; stop-opacity: 0.7\"/>\n      </linearGradient>\n    </defs>\n  </svg>\n</div>\n\n");
$templateCache.put("plugins/camel/html/sendMessage.html","<div ng-controller=\"Camel.SendMessageController\">\n\n  <div class=\"tabbable\" ng-model=\"tab\">\n\n    <div value=\"compose\" class=\"tab-pane\" title=\"Compose\">\n      <!--\n         title=\"Compose a new message to send\"\n      -->\n\n      <div class=\"row-fluid\">\n        <span ng-show=\"noCredentials\" class=\"alert\">\n          No credentials set for endpoint!  Please set your username and password in the <a\n                href=\"\" ng-click=\"openPrefs()\">Preferences</a> page\n        </span>\n\n        <form class=\"form-inline pull-right\">\n          <button class=\"btn\" ng-click=\"addHeader()\" title=\"Add a new message header\"><i\n                  class=\"icon-plus\"></i> Header\n          </button>\n          <button type=\"submit\" class=\"btn btn-primary\" ng-click=\"sendMessage()\">Send message</button>\n        </form>\n      </div>\n\n      <form class=\"form-inline bottom-margin\" ng-submit=\"addHeader()\">\n        <ol class=\"zebra-list header-list\">\n          <div class=\"row-fluid\">\n            <li ng-repeat=\"header in headers\">\n              <div class=\"span4\">\n                <input type=\"text\" style=\"width: 100%\" class=\"headerName\"\n                       ng-model=\"header.name\"\n                       typeahead=\"completion for completion in defaultHeaderNames() | filter:$viewValue\"\n                       typeahead-editable=\'true\'\n                       placeholder=\"Header name\">\n              </div>\n              <div class=\"span6\">\n                <input type=\"text\" style=\"width: 100%\" ng-model=\"header.value\"\n                       placeholder=\"Value of the message header\">\n              </div>\n              <div class=\"span2\">\n                <button type=\"submit\" class=\"btn\" title=\"Add a new message header\">\n                  <i class=\"icon-plus\"></i>\n                </button>\n                <button type=\"button\" ng-click=\"removeHeader(header)\" class=\"btn\" title=\"Removes this message header\">\n                  <i class=\"icon-remove\"></i>\n                </button>\n              </div>\n            </li>\n          </div>\n        </ol>\n      </form>\n\n      <div class=\"row-fluid\">\n        <form class=\"form-inline\">\n          <div class=\"controls\">\n            <label class=\"control-label\" for=\"sourceFormat\" title=\"The text format to use for the message payload\">Payload\n              format: </label>\n            <select ng-model=\"codeMirrorOptions.mode.name\" id=\"sourceFormat\">\n              <option value=\"javascript\">JSON</option>\n              <option value=\"text\" selected>Plain text</option>\n              <option value=\"properties\">Properties</option>\n              <option value=\"xml\">XML</option>\n            </select>\n\n            <button class=\"btn\" ng-click=\"autoFormat()\"\n                    title=\"Automatically pretty prints the message so its easier to read\">Auto format\n            </button>\n          </div>\n        </form>\n      </div>\n\n      <div class=\"row-fluid\">\n        <textarea ui-codemirror=\"codeMirrorOptions\" ng-model=\"message\"></textarea>\n      </div>\n    </div>\n    </tab>\n\n    <div value=\"choose\" class=\"tab-pane\" title=\"Choose\" ng-hide=\"!showChoose\">\n<!--\n         title=\"Choose messages to send from the available files in the Profile configuration for this container\">\n-->\n      <div class=\"row-fluid bottom-margin\">\n        <span ng-show=\"noCredentials\" class=\"alert\">\n          No credentials set for endpoint!  Please set your username and password in the <a\n                href=\"#/preferences\">Preferences</a> page\n        </span>\n        <button type=\"submit\" ng-disabled=\"!fileSelection().length\" class=\"btn btn-primary pull-right\"\n                ng-click=\"sendSelectedFiles()\">\n          <ng-pluralize count=\"fileSelection().length\"\n                        when=\"{\'0\': \'No files selected\', \'1\': \'Send the file\',\'other\': \'Send {} files\'}\">\n          </ng-pluralize>\n        </button>\n      </div>\n\n      <p>Choose which files to send from the profile configuration:</p>\n\n      <div class=\"control-group inline-block\">\n          <input class=\"search-query\" type=\"text\" ng-model=\"searchText\" placeholder=\"Filter...\" autofocus>\n      </div>\n\n      <ul>\n        <li ng-repeat=\"fileName in profileFileNames | filter:searchText\">\n         <input type=\"checkbox\" ng-model=\"selectedFiles[fileName]\"> {{fileName}}\n        </li>\n      </ul>\n    </div>\n  </div>\n</div>\n");
$templateCache.put("plugins/camel/html/source.html","<div class=\"form-horizontal\" ng-controller=\"Camel.SourceController\">\n  <div class=\"row-fluid\">\n    <div class=\"span12\">\n      <button class=\"pull-right btn btn-primary\"\n              hawtio-show object-name=\"{{getSelectionCamelContextMBean(workspace)}}\" method-name=\"addOrUpdateRoutesFromXml\"\n              ng-click=\"saveRouteXml()\"><i class=\"icon-save\"></i> Update</button>\n    </div>\n  </div>\n  <p></p>\n  <div class=\"row-fluid\">\n    <div class=\"span12\">\n      <div hawtio-editor=\"source\" mode=\"mode\"></div>\n    </div>\n  </div>\n</div>\n");
$templateCache.put("plugins/camel/html/traceRoute.html","<div ng-controller=\"Camel.TraceRouteController\">\n  <div class=\"span12 well\" ng-hide=\"tracing\">\n    <form>\n      <p>Tracing allows you to send messages to a route and then step through and see the messages flow through a route\n        to aid debugging and to help diagnose issues.</p>\n\n      <p>Once you start tracing, you can send messages to the input endpoints, then come back to this page and see the\n        flow of messages through your route.</p>\n\n      <p>As you click on the message table, you can see which node in the flow it came through; moving the selection up and down in the message table lets you see the flow of the message through the diagram.</p>\n\n      <button class=\"btn btn-info\" type=\"submit\" ng-click=\"startTracing()\">Start tracing</button>\n    </form>\n  </div>\n  <div ng-show=\"tracing\">\n\n    <form>\n      <button class=\"btn btn-info pull-right\" type=\"submit\" ng-click=\"stopTracing()\">Stop tracing</button>\n    </form>\n    <div ng-include src=\"graphView\">\n    </div>\n\n    <form>\n      <button class=\"btn btn-info pull-right\" type=\"submit\" ng-click=\"clear()\">Clear messages</button>\n    </form>\n    <div>&nbsp;</div>\n    <div ng-include src=\"tableView\">\n    </div>\n\n  </div>\n</div>");
$templateCache.put("plugins/camel/html/typeConverter.html","<div class=\"row-fluid\" ng-controller=\"Camel.TypeConverterController\">\n\n  <!-- the dl need to be wider so we can see the labels -->\n  <style>\n    .dl-horizontal dt {\n      width: 260px;\n    }\n    .dl-horizontal dd {\n      margin-left: 280px;\n    }\n  </style>\n\n  <div ng-show=\"selectedMBean\">\n\n    <div class=\"row-fluid\">\n\n      <div class=\"pull-right\">\n        <form class=\"form-inline no-bottom-margin\">\n          <fieldset>\n            <div class=\"controls control-group inline-block controls-row\">\n              <div class=\"btn-group\">\n                <button\n                    class=\"btn\" ng-click=\"resetStatistics()\" title=\"Reset statistics\">\n                  <i class=\"icon-refresh\"></i></button>\n                <button\n                    ng-disabled=\"mbeanAttributes.StatisticsEnabled\"\n                    class=\"btn\" ng-click=\"enableStatistics()\" title=\"Enable statistics\">\n                  <i class=\"icon-play-circle\"></i></button>\n                <button\n                    ng-disabled=\"!mbeanAttributes.StatisticsEnabled\"\n                    class=\"btn\" ng-click=\"disableStatistics()\" title=\"Disable statistics\">\n                  <i class=\"icon-off\"></i></button>\n              </div>\n            </div>\n          </fieldset>\n        </form>\n      </div>\n      <div>\n        <dl class=\"dl-horizontal\">\n          <dt>Number of Type Converters</dt>\n          <dd>{{mbeanAttributes.NumberOfTypeConverters}}</dd>\n          <dt># Attempts</dt>\n          <dd>{{mbeanAttributes.AttemptCounter}}</dd>\n          <dt># Hit</dt>\n          <dd>{{mbeanAttributes.HitCounter}}</dd>\n          <dt># Miss</dt>\n          <dd>{{mbeanAttributes.MissCounter}}</dd>\n          <dt># Failed</dt>\n          <dd>{{mbeanAttributes.FailedCounter}}</dd>\n          <dt>Statistics Enabled</dt>\n          <dd>{{mbeanAttributes.StatisticsEnabled}}</dd>\n        </dl>\n      </div>\n\n    </div>\n\n    <div class=\"row-fluid\">\n      <div class=\"pull-right\">\n        <form class=\"form-inline no-bottom-margin\">\n          <fieldset>\n            <div class=\"control-group inline-block\">\n              <input type=\"text\" class=\"search-query\" placeholder=\"Filter...\"\n                     ng-model=\"gridOptions.filterOptions.filterText\">\n            </div>\n          </fieldset>\n        </form>\n      </div>\n    </div>\n\n    <div class=\"row-fluid\" ng-show=\"data.length > 0\">\n      <table class=\"table table-condensed table-striped\" hawtio-simple-table=\"gridOptions\"></table>\n    </div>\n    <div class=\"row-fluid\" ng-show=\"data.length == 0\">\n      Loading...\n    </div>\n\n  </div>\n\n</div>\n\n");
$templateCache.put("plugins/docker-registry/html/layoutDockerRegistry.html","<div class=\"row-fluid\" ng-controller=\"DockerRegistry.TopLevel\">\n  <div class=\"span12\">\n    <div ng-view></div>\n  </div>\n</div>\n");
$templateCache.put("plugins/docker-registry/html/list.html","<div class=\"row-fluid\" ng-controller=\"DockerRegistry.ListController\">\n  <script type=\"text/ng-template\" id=\"tagsTemplate.html\">\n    <ul class=\"zebra-list\">\n      <li ng-repeat=\"(name, imageId) in row.entity.tags\" ng-controller=\"DockerRegistry.TagController\">\n        <a href=\"\" ng-click=\"selectImage(imageId)\">{{name}}</a>\n      </li>\n    </ul>\n  </script>\n  <p></p>\n  <div class=\"row-fluid\">\n    <div class=\"span12\">\n      <span ng-hide=\"selectedImage\">\n        <hawtio-filter ng-model=\"tableConfig.filterOptions.filterText\"\n                       css-class=\"input-xxlarge\"\n                       placeholder=\"Filter images...\"\n                       save-as=\"docker-registry-image-list-text-filter\"></hawtio-filter>\n      </span>\n      <button class=\"pull-right btn btn-danger\"\n              ng-disabled=\"tableConfig.selectedItems.length == 0\"\n              ng-hide=\"selectedImage\"\n              ng-click=\"deletePrompt(tableConfig.selectedItems)\"><i class=\"icon-remove\"></i> Delete</button>\n      <span class=\"pull-right\">&nbsp;</span>\n      <button class=\"pull-right btn btn-primary\" \n              ng-show=\"selectedImage\"\n              ng-click=\"selectedImage = undefined\"><i class=\"icon-list\"></i></button>\n    </div>\n  </div>\n  <p></p>\n  <div class=\"row-fluid\" ng-show=\"!fetched\">\n    <div class=\"span12\">\n      <p class=\"text-center\"><i class=\"icon-spinner icon-spin\"></i></p>\n    </div>\n  </div>\n  <div class=\"row-fluid\" ng-show=\"fetched && !selectedImage && imageRepositories.length === 0\">\n    <div class=\"span12\">\n      <p class=\"alert alert-info\">No images are stored in this repository</p>\n    </div>\n  </div>\n  <div class=\"row-fluid\" ng-show=\"fetched && !selectedImage && imageRepositories.length\">\n    <div class=\"span12\">\n      <table class=\"table table-condensed table-striped\"\n             hawtio-simple-table=\"tableConfig\"></table>\n    </div>\n  </div>\n  <div class=\"row-fluid\" ng-show=\"fetched && selectedImage\">\n    <div class=\"span12\">\n      <div hawtio-object=\"selectedImage\"></div>\n    </div>\n  </div>\n</div>\n\n");
$templateCache.put("plugins/karaf/html/feature-details.html","<div>\n    <table class=\"overviewSection\">\n        <tr ng-hide=\"hasFabric\">\n            <td></td>\n            <td class=\"less-big\">\n                <div class=\"btn-group\">\n                  <button ng-click=\"uninstall(name,version)\" \n                          class=\"btn\" \n                          title=\"uninstall\" \n                          hawtio-show\n                          object-name=\"{{featuresMBean}\"\n                          method-name=\"uninstallFeature\">\n                    <i class=\"icon-off\"></i>\n                  </button>\n                  <button ng-click=\"install(name,version)\" \n                          class=\"btn\" \n                          title=\"install\" \n                          hawtio-show\n                          object-name=\"{{featuresMBean}\"\n                          method-name=\"installFeature\">\n                    <i class=icon-play-circle\"></i>\n                  </button>\n                </div>\n            </td>\n        </tr>\n        <tr>\n            <td class=\"pull-right\"><strong>Name:</strong></td>\n            <td class=\"less-big\">{{row.Name}}\n            </td>\n        </tr>\n        <tr>\n            <td class=\"pull-right\"><strong>Version:</strong></td>\n            <td class=\"less-big\">{{row.Version}}\n            </td>\n        </tr>\n        <tr>\n            <td class=\"pull-right\"><strong>Repository:</strong></td>\n            <td class=\"less-big\">{{row.RepositoryName}}\n            </td>\n        </tr>\n        <tr>\n          <td class=\"pull-right\"><strong>Repository URI:</strong></td>\n          <td class=\"less-big\">{{row.RepositoryURI}}\n          </td>\n        </tr>\n        <tr>\n            <td class=\"pull-right\"><strong>State:</strong></td>\n            <td class=\"wrap\">\n                <div ng-switch=\"row.Installed\">\n                    <p style=\"display: inline;\" ng-switch-when=\"true\">Installed</p>\n\n                    <p style=\"display: inline;\" ng-switch-default>Not Installed</p>\n                </div>\n            </td>\n        </tr>\n        <tr>\n            <td>\n            </td>\n            <td>\n                <div class=\"accordion\" id=\"accordionFeatures\">\n                    <div class=\"accordion-group\">\n                        <div class=\"accordion-heading\">\n                            <a class=\"accordion-toggle\" data-toggle=\"collapse\" data-parent=\"#accordionFeatures\"\n                               href=\"#collapseFeatures\">\n                                Features\n                            </a>\n                        </div>\n                        <div id=\"collapseFeatures\" class=\"accordion-body collapse in\">\n                            <ul class=\"accordion-inner\">\n                                <li ng-repeat=\"feature in row.Dependencies\">\n                                    <a href=\'#/osgi/feature/{{feature.Name}}/{{feature.Version}}?p=container\'>{{feature.Name}}/{{feature.Version}}</a>\n                                </li>\n                            </ul>\n                        </div>\n                    </div>\n                </div>\n            </td>\n        </tr>\n        <tr>\n            <td>\n            </td>\n            <td>\n                <div class=\"accordion\" id=\"accordionBundles\">\n                    <div class=\"accordion-group\">\n                        <div class=\"accordion-heading\">\n                            <a class=\"accordion-toggle\" data-toggle=\"collapse\" data-parent=\"#accordionBundles\"\n                               href=\"#collapseBundles\">\n                                Bundles\n                            </a>\n                        </div>\n                        <div id=\"collapseBundles\" class=\"accordion-body collapse in\">\n                            <ul class=\"accordion-inner\">\n                                <li ng-repeat=\"bundle in row.BundleDetails\">\n                                    <div ng-switch=\"bundle.Installed\">\n                                        <p style=\"display: inline;\" ng-switch-when=\"true\">\n                                            <a href=\'#/osgi/bundle/{{bundle.Identifier}}?p=container\'>{{bundle.Location}}</a></p>\n\n                                        <p style=\"display: inline;\" ng-switch-default>{{bundle.Location}}</p>\n                                    </div>\n                                </li>\n                            </ul>\n                        </div>\n                    </div>\n                </div>\n            </td>\n        </tr>\n        <tr>\n            <td>\n            </td>\n            <td>\n                <div class=\"accordion\" id=\"accordionConfigurations\">\n                    <div class=\"accordion-group\">\n                        <div class=\"accordion-heading\">\n                            <a class=\"accordion-toggle\" data-toggle=\"collapse\" data-parent=\"#accordionConfigurations\"\n                               href=\"#collapsConfigurations\">\n                                Configurations\n                            </a>\n                        </div>\n                        <div id=\"collapsConfigurations\" class=\"accordion-body collapse in\">\n                            <table class=\"accordion-inner\">\n                                <tr ng-repeat=\"(pid, value) in row.Configurations\">\n                                    <td>\n                                      <p>{{value.Pid}}</p>\n                                      <div hawtio-editor=\"toProperties(value.Elements)\" mode=\"props\"></div></td>\n                                </tr>\n                            </table>\n                        </div>\n                    </div>\n                </div>\n            </td>\n        </tr>\n        <tr>\n            <td>\n            </td>\n            <td>\n                <div class=\"accordion\" id=\"accordionConfigurationFiles\">\n                    <div class=\"accordion-group\">\n                        <div class=\"accordion-heading\">\n                            <a class=\"accordion-toggle\" data-toggle=\"collapse\" data-parent=\"#accordionConfigurationFiles\"\n                               href=\"#collapsConfigurationFiles\">\n                                Configuration Files\n                            </a>\n                        </div>\n                        <div id=\"collapsConfigurationFiles\" class=\"accordion-body collapse in\">\n                            <table class=\"accordion-inner\">\n                                <tr ng-repeat=\"file in row.Files\">\n                                    <td>{{file.Files}}</td>\n                                </tr>\n                            </table>\n                        </div>\n                    </div>\n                </div>\n            </td>\n        </tr>\n    </table>\n</div>\n");
$templateCache.put("plugins/karaf/html/feature.html","<div class=\"controller-section\" ng-controller=\"Karaf.FeatureController\">\n  <div class=\"row-fluid\">\n    <div class=\"span4\">\n      <h1>{{row.id}}</h1>\n    </div>\n  </div>\n\n  <div ng-include src=\"\'app/karaf/html/feature-details.html\'\"></div>\n\n</div>\n\n");
$templateCache.put("plugins/karaf/html/features.html","<div class=\"controller-section\" ng-controller=\"Karaf.FeaturesController\">\n\n  <div class=\"row-fluid section-filter\">\n    <input type=\"text\" class=\"span12 search-query\" placeholder=\"Filter...\" ng-model=\"filter\">\n    <i class=\"icon-remove clickable\" title=\"Clear filter\" ng-click=\"filter = \'\'\"></i>\n  </div>\n\n  <script type=\"text/ng-template\" id=\"popoverTemplate\">\n    <small>\n      <table class=\"table\">\n        <tbody>\n        <tr ng-repeat=\"(k, v) in feature track by $index\" ng-show=\"showRow(k, v)\">\n          <td class=\"property-name\">{{k}}</td>\n          <td class=\"property-value\" ng-bind-html-unsafe=\"showValue(v)\"></td>\n        </tr>\n        </tbody>\n      </table>\n    </small>\n  </script>\n\n  <p></p>\n  <div class=\"row-fluid\">\n    <div class=\"span6\">\n      <h3 class=\"centered\">Installed Features</h3>\n      <div ng-show=\"featuresError\" class=\"alert alert-warning\">\n        The feature list returned by the server was null, please check the logs and Karaf console for errors.\n      </div>\n      <div class=\"bundle-list\"\n           hawtio-auto-columns=\".bundle-item\">\n        <div ng-repeat=\"feature in installedFeatures\"\n             class=\"bundle-item\"\n             ng-show=\"filterFeature(feature)\"\n             ng-class=\"inSelectedRepository(feature)\">\n          <a ng-href=\"#/osgi/feature/{{feature.Id}}?p=container\"\n             hawtio-template-popover title=\"Feature details\">\n            <span class=\"badge\" ng-class=\"getStateStyle(feature)\">{{feature.Name}} / {{feature.Version}}</span>\n          </a>\n          <span ng-hide=\"hasFabric\">\n            <a class=\"toggle-action\"\n               href=\"\"\n               ng-show=\"installed(feature.Installed)\"\n               ng-click=\"uninstall(feature)\"\n               hawtio-show\n               object-name=\"{{featuresMBean}\"\n               method-name=\"uninstallFeature\">\n              <i class=\"icon-power-off\"></i>\n            </a>\n            <a class=\"toggle-action\"\n               href=\"\"\n               ng-hide=\"installed(feature.Installed)\"\n               ng-click=\"install(feature)\"\n               hawtio-show\n               object-name=\"{{featuresMBean}\"\n               method-name=\"installFeature\">\n              <i class=\"icon-play-circle\"></i>\n            </a>\n          </span>\n        </div>\n      </div>\n    </div>\n\n    <div class=\"span6\">\n      <h3 class=\"centered\">Available Features</h3>\n      <div class=\"row-fluid repository-browser-toolbar centered\">\n        <select id=\"repos\"\n                class=\"input-xlarge\"\n                title=\"Feature repositories\"\n                ng-model=\"selectedRepository\"\n                ng-options=\"r.repository for r in repositories\"></select>\n        <button class=\"btn\"\n                title=\"Remove selected feature repository\"\n                ng-click=\"uninstallRepository()\"\n                ng-hide=\"hasFabric\"\n                hawtio-show\n                object-name=\"{{featuresMBean}}\"\n                method-name=\"removeRepository\"><i class=\"icon-remove-sign\"></i></button>\n        <input type=\"text\"\n               class=\"input-xlarge\"\n               placeholder=\"mvn:foo/bar/1.0/xml/features\"\n               title=\"New feature repository URL\"\n               ng-model=\"newRepositoryURI\"\n               ng-hide=\"hasFabric\"\n               hawtio-show\n               object-name=\"{{featuresMBean}}\"\n               method-name=\"addRepository\">\n        <button class=\"btn\"\n                title=\"Add feature repository URL\"\n                ng-hide=\"hasFabric\"\n                ng-click=\"installRepository()\"\n                ng-disabled=\"isValidRepository()\"\n                hawtio-show\n                object-name=\"{{featuresMBean}}\"\n                method-name=\"addRepository\"><i class=\"icon-plus\"></i></button>\n      </div>\n      <div class=\"row-fluid\">\n        <div class=\"bundle-list\"\n             hawtio-auto-columns=\".bundle-item\">\n          <div ng-repeat=\"feature in selectedRepository.features\"\n               class=\"bundle-item\"\n               ng-show=\"filterFeature(feature)\"\n               hawtio-template-popover title=\"Feature details\">\n            <a ng-href=\"#/osgi/feature/{{feature.Id}}?p=container\">\n              <span class=\"badge\" ng-class=\"getStateStyle(feature)\">{{feature.Name}} / {{feature.Version}}</span>\n            </a >\n            <span ng-hide=\"hasFabric\">\n              <a class=\"toggle-action\"\n                 href=\"\"\n                 ng-show=\"installed(feature.Installed)\"\n                 ng-click=\"uninstall(feature)\"\n                 hawtio-show\n                 object-name=\"{{featuresMBean}\"\n                 method-name=\"uninstallFeature\">\n                <i class=\"icon-power-off\"></i>\n              </a>\n              <a class=\"toggle-action\"\n                 href=\"\"\n                 ng-hide=\"installed(feature.Installed)\"\n                 ng-click=\"install(feature)\"\n                 hawtio-show\n                 object-name=\"{{featuresMBean}\"\n                 method-name=\"installFeature\">\n                <i class=\"icon-play-circle\"></i>\n              </a>\n            </span>\n          </div>\n        </div>\n      </div>\n    </div>\n\n  </div>\n\n</div>\n");
$templateCache.put("plugins/karaf/html/scr-component-details.html","<div>\n    <table class=\"overviewSection\">\n        <tr ng-hide=\"hasFabric\">\n            <td></td>\n            <td class=\"less-big\">\n                <div class=\"btn-group\">\n                  <button class=\"btn\" \n                          ng-click=\"activate()\"\n                          hawtio-show\n                          object-name=\"{{scrMBean}}\"\n                          method-name=\"activateComponent\">\n                    <i class=\"icon-play-circle\"></i> Activate\n                  </button>\n                  <button class=\"btn\" \n                          ng-click=\"deactivate()\"\n                          hawtio-show\n                          object-name=\"{{scrMBean}}\"\n                          method-name=\"deactiveateComponent\">\n                    <i class=\"icon-off\"></i> Deactivate\n                  </button>\n                </div>\n            </td>\n        </tr>\n        <tr>\n            <td class=\"pull-right\"><strong>Id:</strong></td>\n            <td class=\"less-big\">{{row.Id}}\n            </td>\n        </tr>\n        <tr>\n            <td class=\"pull-right\"><strong>Name:</strong></td>\n            <td class=\"less-big\">{{row.Name}}\n            </td>\n        </tr>\n        <tr>\n            <td class=\"pull-right\"><strong>State:</strong></td>\n            <td class=\"less-big\">{{row.State}}\n            </td>\n        </tr>\n        <tr>\n            <td>\n            </td>\n            <td>\n                <div class=\"accordion\" id=\"accordionProperties\">\n                    <div class=\"accordion-group\">\n                        <div class=\"accordion-heading\">\n                            <a class=\"accordion-toggle\" data-toggle=\"collapse\" data-parent=\"#accordionProperties\"\n                               href=\"#collapseProperties\">\n                                Properties\n                            </a>\n                        </div>\n                        <div id=\"collapseProperties\" class=\"accordion-body collapse in\">\n                            <table class=\"accordion-inner\">\n                                <tr ng-repeat=\"(key, value) in row.Properties\">\n                                    <td valign=\"top\">{{key}}</td>\n                                    <td>{{value.Value}}</td>\n                                </tr>\n                            </table>\n                        </div>\n                    </div>\n                </div>\n            </td>\n        </tr>\n        <tr>\n            <td>\n            </td>\n            <td>\n                <div class=\"accordion\" id=\"accordionReferences\">\n                    <div class=\"accordion-group\">\n                        <div class=\"accordion-heading\">\n                            <a class=\"accordion-toggle\" data-toggle=\"collapse\" data-parent=\"#accordionReferences\"\n                               href=\"#collapseReferences\">\n                                References\n                            </a>\n                        </div>\n                        <div id=\"collapseReferences\" class=\"accordion-body collapse in\">\n                            <table class=\"accordion-inner\">\n                                <thead>\n                                <tr>\n                                    <th>Name</th>\n                                    <th>Availability</th>\n                                    <th>Cardinality</th>\n                                    <th>Policy</th>\n                                    <th>Bound Services</th>\n                                </tr>\n                                </thead>\n                                <tbody>\n                                    <tr ng-repeat=\"(key, value) in row.References\">\n                                        <td valign=\"left\" class=\"less-big\">{{value.Name}}</td>\n                                        <td valign=\"left\" class=\"less-big\">{{value.Availability}}</td>\n                                        <td valign=\"left\" class=\"less-big\">{{value.Cardinality}}</td>\n                                        <td valign=\"left\" class=\"less-big\">{{value.Policy}}</td>\n                                        <td>\n                                            <ul>\n                                                <li ng-repeat=\"id in value[\'Bound Services\']\">\n                                                    <i class=\"icon-cog less-big text-info\" id=\"bound.service.{{id}}\">{{id}}</i>\n                                                </li>\n                                            </ul>\n                                        </td>\n                                    </tr>\n                                </tbody>\n                            </table>\n                        </div>\n                    </div>\n                </div>\n            </td>\n        </tr>\n    </table>\n</div>\n");
$templateCache.put("plugins/karaf/html/scr-component.html","<div class=\"controller-section\" ng-controller=\"Karaf.ScrComponentController\">\n    <div class=\"row-fluid\">\n        <div class=\"span4\">\n            <h1>{{row.id}}</h1>\n        </div>\n    </div>\n\n    <div ng-include src=\"\'app/karaf/html/scr-component-details.html\'\"></div>\n\n</div>\n");
$templateCache.put("plugins/karaf/html/scr-components.html","<div class=\"controller-section\" ng-controller=\"Karaf.ScrComponentsController\">\n  <div class=\"row-fluid\">\n    <div class=\"pull-left\">\n      <form class=\"form-inline no-bottom-margin\">\n        <fieldset>\n          <div class=\"control-group inline-block\">\n            <div class=\"btn-group\">\n              <button ng-disabled=\"selectedComponents.length == 0\" \n                      class=\"btn\" \n                      ng-click=\"activate()\"\n                      hawtio-show\n                      object-name=\"{{scrMBean}}\"\n                      method-name=\"activateComponent\"><i\n                      class=\"icon-play-circle\"></i> Activate\n              </button>\n              <button ng-disabled=\"selectedComponents.length == 0\" \n                      class=\"btn\" \n                      ng-click=\"deactivate()\"\n                      hawtio-show\n                      object-name=\"{{scrMBean}}\"\n                      method-name=\"deactiveateComponent\"><i\n                      class=\"icon-off\"></i> Deactivate\n              </button>\n            </div>\n          </div>\n        </fieldset>\n      </form>\n    </div>\n\n    <div class=\"pull-right\">\n      <input type=\"text\" class=\"input-text search-query\" placeholder=\"Filter...\" ng-model=\"scrOptions.filterOptions.filterText\">\n    </div>\n  </div>\n\n\n  <div class=\"row-fluid\">\n    <div class=\"gridStyle\" ng-grid=\"scrOptions\"></div>\n  </div>\n</div>\n");
$templateCache.put("plugins/karaf/html/server.html","<div class=\"controller-section row-fluid\" ng-controller=\"Karaf.ServerController\">\n\n  <dl class=\"dl-horizontal\">\n    <dt>Name</dt>\n    <dd>{{data.name}}</dd>\n    <dt>Version</dt>\n    <dd>{{data.version}}</dd>\n    <dt>State</dt>\n    <dd>{{data.state}}</dd>\n    <dt>Is root</dt>\n    <dd>{{data.root}}</dd>\n    <dt>Start Level</dt>\n    <dd>{{data.startLevel}}</dd>\n    <dt>Framework</dt>\n    <dd>{{data.framework}}</dd>\n    <dt>Framework Version</dt>\n    <dd>{{data.frameworkVersion}}</dd>\n    <dt>Location</dt>\n    <dd>{{data.location}}</dd>\n    <dt>SSH Port</dt>\n    <dd>{{data.sshPort}}</dd>\n    <dt>RMI Registry Port</dt>\n    <dd>{{data.rmiRegistryPort}}</dd>\n    <dt>RMI Server Port</dt>\n    <dd>{{data.rmiServerPort}}</dd>\n    <dt>PID</dt>\n    <dd>{{data.pid}}</dd>\n  </dl>\n\n</div>\n\n");
$templateCache.put("plugins/osgi/html/bundle-details.html","<div>\n  <table>\n    <tr>\n      <td></td>\n      <td class=\"less-big\">\n        <div class=\"btn-group\">\n          <button ng-click=\"stopBundle(bundleId)\" \n                  class=\"btn\" \n                  hawtio-show\n                  object-name=\"{{frameworkMBean}}\"\n                  method-name=\"stopBundle\"\n                  title=\"stop\"><i class=\"icon-off\"/></button>\n          <button ng-click=\"startBundle(bundleId)\" \n                  class=\"btn\" \n                  hawtio-show\n                  object-name=\"{{frameworkMBean}}\"\n                  method-name=\"startBundle\"\n                  title=\"start\"><i class=\"icon-play-circle\"/></button>\n          <button ng-click=\"refreshBundle(bundleId)\" \n                  class=\"btn\" \n                  hawtio-show\n                  object-name=\"{{frameworkMBean}}\"\n                  method-name=\"refreshBundle\"\n                  title=\"refresh\"><i class=\"icon-refresh\"/></button>\n          <button ng-click=\"updateBundle(bundleId)\" \n                  class=\"btn\" \n                  hawtio-show\n                  object-name=\"{{frameworkMBean}}\"\n                  method-name=\"updateBundle\"\n                  title=\"update\"><i class=\"icon-cloud-download\"/></button>\n          <button ng-click=\"uninstallBundle(bundleId)\" \n                  class=\"btn\" \n                  hawtio-show\n                  object-name=\"{{frameworkMBean}}\"\n                  method-name=\"uninstallBundle\"\n                  title=\"uninstall\"><i class=\"icon-eject\"/></button>\n        </div>\n      </td>\n    </tr>\n    <tr>\n      <td><p/></td>\n      <td/>\n    <tr>\n      <td>\n        <div ng-switch=\"row.Fragment\">\n          <div ng-switch-when=\"true\"><strong>Fragment&nbsp;ID:</strong></div>\n          <div ng-switch-default><strong>Bundle&nbsp;ID:</strong></div>\n        </div>\n      </td>\n      <td class=\"less-big\">{{row.Identifier}}\n      </td>\n    </tr>\n    <tr>\n      <td><strong>Bundle&nbsp;Name:</strong></td>\n      <td class=\"less-big\">{{row.Headers[\'Bundle-Name\'].Value}}\n      </td>\n    </tr>\n    <tr>\n      <td><strong>Symbolic&nbsp;Name:</strong></td>\n      <td class=\"less-big label\">\n        <div id=\"bsn\" rel=\"tooltip\">{{row.SymbolicName}}</div>\n      </td>\n    </tr>\n    <tr>\n      <td><strong>Version:</strong></td>\n      <td class=\"less-big\">{{row.Version}}\n      </td>\n    </tr>\n    <tr>\n      <td><strong>Start&nbsp;Level:</strong></td>\n      <td class=\"less-big\">{{row.StartLevel}}\n      </td>\n    </tr>\n    <tr>\n      <td><strong>Location:</strong></td>\n      <td class=\"less-big\">\n        <a ng-href=\"{{mavenLink(row)}}\">\n          {{row.Location}}\n        </a>\n      </td>\n    </tr>\n    <tr>\n      <td><strong>State:</strong></td>\n      <td>\n        <div class=\"less-big label\" ng-class=\"row.StateStyle\">{{row.State}}</div>\n      </td>\n    </tr>\n    <tr>\n      <td><strong>Last&nbsp;Modified:</strong></td>\n      <td class=\"less-big\">{{row.LastModified | date:\'medium\'}}\n      </td>\n    </tr>\n    <tr>\n      <td>\n        <div ng-switch=\"row.Fragment\">\n          <div ng-switch-when=\"true\"><strong>Hosts:</strong></div>\n          <div ng-switch-default><strong>Fragments:</strong></div>\n        </div>\n      </td>\n      <td class=\"less-big\">\n        <div ng-switch=\"row.Fragment\">\n          <div ng-switch-when=\"true\" ng-bind-html-unsafe=\"row.Hosts\"/>\n          <div ng-switch-default ng-bind-html-unsafe=\"row.Fragments\"/>\n        </div>\n      </td>\n    </tr>\n    <tr>\n      <td>\n      </td>\n      <td>\n        <div class=\"accordion\" id=\"accordionInspectClassloading\">\n          <div class=\"accordion-group\">\n            <div class=\"accordion-heading\">\n              <a class=\"accordion-toggle\" data-toggle=\"collapse\" data-parent=\"#accordionInspectClassloading\"\n                 href=\"#collapseInspectClassloading\">\n                Inspect Classloading\n              </a>\n            </div>\n            <div id=\"collapseInspectClassloading\" class=\"accordion-body collapse in\">\n              <form class=\"form-inline\" hawtio-show object-name=\"{{osgiToolsMBean}}\" operation-name=\"getLoadClassOrigin\">\n                <fieldset>\n                  &nbsp;&nbsp;\n                  <input class=\"input-xlarge\" type=\"text\" ng-model=\"classToLoad\" placeHolder=\"Enter Class Name to Load...\">\n                  <button class=\"btn btn-success execute\" ng-click=\"executeLoadClass(classToLoad)\">Load class</button>\n                </fieldset>\n              </form>\n              <form class=\"form-inline\" hawtio-show object-name=\"{{osgiToolsMBean}}\" operation-name=\"getResourceURL\">\n                <fieldset>\n                  &nbsp;&nbsp;\n                  <input class=\"input-xlarge\" type=\"text\" ng-model=\"resourceToLoad\"\n                         placeHolder=\"Enter Resource Name to Find...\">\n                  <button class=\"btn btn-success execute\" ng-click=\"executeFindResource(resourceToLoad)\">Get resource\n                  </button>\n                </fieldset>\n              </form>\n              <div id=\"loadClassResult\"/>\n            </div>\n          </div>\n        </div>\n      </td>\n    </tr>\n    <tr>\n      <td>\n      </td>\n      <td>\n        <div class=\"accordion\" id=\"accordionImportedPackages\">\n          <div class=\"accordion-group\">\n            <div class=\"accordion-heading\">\n              <a class=\"accordion-toggle\" data-toggle=\"collapse\" data-parent=\"#accordionImportedPackages\"\n                 href=\"#collapseImportedPackages\">\n                Imported Packages\n              </a>\n            </div>\n            <div id=\"collapseImportedPackages\" class=\"accordion-body collapse in\">\n              <table>\n                <tr ng-repeat=\"(package, data) in row.ImportData\">\n                  <td>\n                    <div class=\"less-big badge\" id=\"import.{{package}}\">{{package}}</div>\n                  </td>\n                </tr>\n              </table>\n              <div id=\"unsatisfiedOptionalImports\"/>\n            </div>\n          </div>\n        </div>\n      </td>\n    </tr>\n    <tr>\n      <td>\n      </td>\n      <td>\n        <div class=\"accordion\" id=\"accordionExportedPackages\">\n          <div class=\"accordion-group\">\n            <div class=\"accordion-heading\">\n              <a class=\"accordion-toggle\" data-toggle=\"collapse\" data-parent=\"#accordionExportedPackages\"\n                 href=\"#collapseExportedPackages\">\n                Exported Packages\n              </a>\n            </div>\n            <div id=\"collapseExportedPackages\" class=\"accordion-body collapse in\">\n              <table>\n                <tr ng-repeat=\"(package, data) in row.ExportData\">\n                  <td>\n                    <div class=\"less-big badge badge-success\" id=\"export.{{package}}\">{{package}}</div>\n                  </td>\n                </tr>\n              </table>\n            </div>\n          </div>\n        </div>\n      </td>\n    </tr>\n    <tr>\n      <td></td>\n      <td>\n        <div class=\"accordion\" id=\"accordionServices\">\n          <div class=\"accordion-group\">\n            <div class=\"accordion-heading\">\n              <a class=\"accordion-toggle\" data-toggle=\"collapse\" data-parent=\"#accordionServices\"\n                 href=\"#collapseServices\">\n                Services\n              </a>\n            </div>\n            <div id=\"collapseServices\" class=\"accordion-body collapse in\">\n              Registered Services\n              <table>\n                <tr ng-repeat=\"id in row.RegisteredServices\">\n                  <td><i class=\"icon-cog less-big text-success\" id=\"registers.service.{{id}}\">{{id}}</i></td>\n                </tr>\n              </table>\n              <br/>\n              Services used by this Bundle\n              <table>\n                <tr ng-repeat=\"id in row.ServicesInUse\">\n                  <td><i class=\"icon-cog less-big text-info\" id=\"uses.service.{{id}}\">{{id}}</i></td>\n                </tr>\n              </table>\n            </div>\n          </div>\n        </div>\n      </td>\n    </tr>\n    <tr>\n      <td>\n      </td>\n      <td>\n        <div class=\"accordion\" id=\"accordionRequiringBundles\">\n          <div class=\"accordion-group\">\n            <div class=\"accordion-heading\">\n              <a class=\"accordion-toggle\" data-toggle=\"collapse\" data-parent=\"#accordionRequiringBundles\"\n                 href=\"#collapseRequiringBundles\">\n                Other Bundles using this Bundle\n              </a>\n            </div>\n            <div id=\"collapseRequiringBundles\" class=\"accordion-body collapse in\">\n              <div class=\"accordion-inner\">\n                <span ng-bind-html-unsafe=\"row.RequiringBundles\"/>\n              </div>\n            </div>\n          </div>\n        </div>\n      </td>\n    </tr>\n    <tr>\n      <td>\n      </td>\n      <td>\n        <div class=\"accordion\" id=\"accordionHeaders\">\n          <div class=\"accordion-group\">\n            <div class=\"accordion-heading\">\n              <a class=\"accordion-toggle\" data-toggle=\"collapse\" data-parent=\"#accordionHeaders\"\n                 href=\"#collapsHeaders\">\n                Headers\n              </a>\n            </div>\n            <div id=\"collapsHeaders\" class=\"accordion-body collapse in\">\n              <table class=\"accordion-inner\">\n                <tr ng-repeat=\"(key, value) in row.Headers\" ng-show=\"showValue(key)\">\n                  <td valign=\"top\">{{key}}</td>\n                  <td>{{value.Value}}</td>\n                </tr>\n              </table>\n            </div>\n          </div>\n        </div>\n      </td>\n    </tr>\n  </table>\n</div>\n");
$templateCache.put("plugins/osgi/html/bundle-list.html","<div class=\"controller-section\" ng-controller=\"Osgi.BundleListController\">\n  <div class=\"row-fluid bundle-list-toolbar\">\n\n    <div class=\"pull-left\">\n      <div class=\"btn-group\">\n        <a ng-href=\"#/osgi/bundle-list?p=container\"\n                type=\"button\"\n                class=\"btn active\"\n                title=\"List view\">\n          <i class=\"icon-list\"></i>\n        </a>\n        <a ng-href=\"#/osgi/bundles?p=container\"\n                type=\"button\"\n                class=\"btn\"\n                title=\"Table view\">\n          <i class=\"icon-table\"></i>\n        </a>\n      </div>\n\n      <div class=\"input-append\" hawtio-show object-name=\"{{frameworkMBean}}\" method-name=\"installBundle\">\n        <input class=\"input-xxlarge\"\n               type=\"text\"\n               placeholder=\"Install Bundle...\"\n               ng-model=\"bundleUrl\">\n        <button ng-disabled=\"installDisabled()\"\n                class=\"btn\"\n                ng-click=\"install()\"\n                title=\"Install\">\n          <i class=\"icon-ok\"></i>\n        </button>\n      </div>\n\n    </div>\n\n\n    <div class=\"pull-right\">\n      <strong>Show bundles: </strong>\n      &nbsp;\n      <label for=\"showActiveMQBundles\">ActiveMQ</label>\n      <input id=\"showActiveMQBundles\" type=\"checkbox\" ng-model=\"display.showActiveMQBundles\">\n      &nbsp;\n      &nbsp;\n      <label for=\"showCamelBundles\">Camel</label>\n      <input id=\"showCamelBundles\" type=\"checkbox\" ng-model=\"display.showCamelBundles\">\n      &nbsp;\n      &nbsp;\n      <label for=\"showCxfBundles\">CXF</label>\n      <input id=\"showCxfBundles\" type=\"checkbox\" ng-model=\"display.showCxfBundles\">\n      &nbsp;\n      &nbsp;\n      <label for=\"showPlatformBundles\">Platform</label>\n      <input id=\"showPlatformBundles\" type=\"checkbox\" ng-model=\"display.showPlatformBundles\">\n      &nbsp;\n      &nbsp;\n      &nbsp;\n      <select class=\"input-large\" ng-model=\"display.sortField\" id=\"sortField\">\n        <option value=\"Identifier\">Sort by ID</option>\n        <option value=\"Name\">Sort by Name</option>\n        <option value=\"SymbolicName\">Sort by Symbolic Name</option>\n      </select>\n      <select class=\"input-large\" ng-model=\"display.bundleField\" id=\"bundleField\">\n        <option value=\"Name\">Display Name</option>\n        <option value=\"SymbolicName\">Display Symbolic Name</option>\n      </select>\n      <input class=\"input-small search-query\" type=\"number\" min=\"0\"\n             ng-model=\"display.startLevelFilter\"\n             placeholder=\"Start Level...\"/>\n      <hawtio-filter ng-model=\"display.bundleFilter\" placeholder=\"Filter...\" save-as=\"osgi-bundle-list-text-filter\"></hawtio-filter>\n    </div>\n\n  </div>\n\n  <div class=\"row-fluid\" id=\"bundleTableHolder\">\n    <!-- Just create a bit of space between the form and the controls -->\n    <p></p>\n\n    <script type=\"text/ng-template\" id=\"popoverTemplate\">\n<small>\n  <table class=\"table\">\n    <tbody>\n    <tr ng-repeat=\"(k, v) in bundle track by $index\">\n      <td class=\"property-name\">{{k}}</td>\n      <td class=\"property-value\">{{v}}</td>\n    </tr>\n    </tbody>\n  </table>\n</small>\n    </script>\n\n    <div class=\"bundle-list centered\"\n         hawtio-auto-columns=\".bundle-item\">\n      <div ng-repeat=\"bundle in bundles\"\n           class=\"bundle-item\"\n           ng-show=\"filterBundle(bundle)\"\n           hawtio-template-popover title=\"Bundle details\">\n        <a id=\"{{bundle.Identifier}}\"\n           ng-href=\"#/osgi/bundle/{{bundle.Identifier}}?p=container\">\n          <span class=\"badge\" ng-class=\"getStateStyle(bundle.State)\">{{getLabel(bundle)}}</span>\n        </a>\n      </div>\n    </div>\n  </div>\n</div>\n");
$templateCache.put("plugins/osgi/html/bundle.html","<div class=\"controller-section\" ng-controller=\"Osgi.BundleController\">\n  <div ng-include src=\"\'app/osgi/html/bundle-details.html\'\"></div>\n</div>\n");
$templateCache.put("plugins/osgi/html/bundles.html","<div class=\"controller-section\" ng-controller=\"Osgi.BundlesController\">\n  <div class=\"row-fluid\">\n    <div class=\"pull-left\">\n\n      <form class=\"form-inline no-bottom-margin\">\n        <fieldset>\n\n          <div class=\"btn-group inline-block\">\n            <a ng-href=\"#/osgi/bundle-list?p=container\"\n                    type=\"button\"\n                    class=\"btn\"\n                    title=\"List view\">\n              <i class=\"icon-list\"></i>\n            </a>\n            <a ng-href=\"#/osgi/bundles?p=container\"\n                    type=\"button\"\n                    class=\"btn active\"\n                    title=\"Table view\">\n              <i class=\"icon-table\"></i>\n            </a>\n          </div>\n\n          <div class=\"controls control-group inline-block controls-row\">\n            <div class=\"btn-group\">\n              <button ng-disabled=\"selected.length == 0\" class=\"btn\" ng-click=\"stop()\" title=\"Stop\"><i class=\"icon-off\"></i></button>\n              <button ng-disabled=\"selected.length == 0\" class=\"btn\" ng-click=\"start()\" title=\"Start\"><i class=\"icon-play-circle\"></i></button>\n              <button ng-disabled=\"selected.length == 0\" class=\"btn\" ng-click=\"refresh()\" title=\"Refresh\"><i class=\"icon-refresh\"></i></button>\n              <button ng-disabled=\"selected.length == 0\" class=\"btn\" ng-click=\"update()\" title=\"Update\"><i class=\"icon-cloud-download\"></i></button>\n              <button ng-disabled=\"selected.length == 0\" class=\"btn\" ng-click=\"uninstall()\" title=\"Uninstall\"><i class=\"icon-eject\"></i></button>\n            </div>\n            <div class=\"input-append\">\n              <input class=\"input-xlarge\" type=\"text\" placeholder=\"Install Bundle...\" ng-model=\"bundleUrl\">\n              <button ng-disabled=\"installDisabled()\" class=\"btn\" ng-click=\"install()\" title=\"Install\"><i class=\"icon-ok\"></i></button>\n            </div>\n          </div>\n        </fieldset>\n      </form>\n      \n    </div>\n\n    <div class=\"pull-right\">\n      <form class=\"form-inline no-bottom-margin\">\n        <fieldset>\n          <div class=\"control-group inline-block\">\n            <input type=\"text\"\n                   class=\"input-large search-query\"\n                   placeholder=\"Filter...\"\n                   ng-model=\"gridOptions.filterOptions.filterText\">\n          </div>\n        </fieldset>\n      </form>\n\n    </div>\n  </div>\n  \n  \n  <div class=\"row-fluid\">\n    <div ng-hide=\"loading\" class=\"gridStyle\" ng-grid=\"gridOptions\"></div>\n    <div ng-show=\"loading\">\n      Please wait, loading...\n    </div>\n  </div>\n</div>\n");
$templateCache.put("plugins/osgi/html/configurations.html","<style type=\"text/css\">\n  .configuration-header {\n    margin: 20px 20px;\n  }\n\n  ul.configurations,\n  ul.configurations li {\n    list-style: none;\n  }\n\n  ul.configurations {\n    margin: 0px 20px;\n  }\n\n  ul.configurations .bundle-item {\n    display: list-item;\n    margin-bottom: 4px;\n  }\n\n  ul.configurations li.bundle-item a {\n    /*\n      TODO it\'d be nice to use the natural widgth here,\n      but then it might be nice to use multiple columns?\n    */\n    width: 450px;\n  }\n</style>\n\n<div class=\"controller-section\" ng-controller=\"Osgi.ConfigurationsController\">\n  <div class=\"row-fluid\">\n    <div class=\"configuration-header\">\n      <div class=\"configuration-filter\">\n        <input type=\"text\" class=\"span8 search-query\" placeholder=\"Filter...\" ng-model=\"filterText\">\n        <i class=\"icon-remove clickable\" title=\"Clear filter\" ng-click=\"filterText = \'\'\"></i>\n        <button class=\"btn pull-right\" ng-click=\"addPidDialog.open()\" title=\"Add a new configuration\" hawtio-show object-name=\"{{hawtioConfigAdminMBean}}\" method-name=\"configAdminUpdate\"><i\n                class=\"icon-plus\"></i> Configuration\n        </button>\n      </div>\n    </div>\n  </div>\n\n  <div class=\"row-fluid centered\" ng-hide=\"configurations.length\">\n    <i class=\"icon-spinner icon-spin\"></i>\n  </div>\n\n  <ul class=\"configurations\">\n    <li ng-repeat=\'config in configurations | filter:filterText\' class=\'{{config.class}} bundle-item\'>\n      <a ng-href=\"{{config.pidLink}}\" title=\"{{config.description}}\">\n        <span class=\"{{config.kind.class}}\">{{config.name}}</span>\n      </a>\n      <ul ng-show=\"config.isFactory\">\n        <li ng-repeat=\"child in config.children\" class=\'{{child.class}} bundle-item\'>\n          <a ng-href=\"{{child.pidLink}}\" title=\"{{child.description}}\">\n            <span class=\"{{child.kind.class}}\">{{child.name}}</span>\n          </a>\n        </li>\n      </ul>\n    </li>\n  </ul>\n\n  <div modal=\"addPidDialog.show\" close=\"addPidDialog.close()\" options=\"addPidDialog.options\">\n    <form name=\"addPidDialogForm\" class=\"form-horizontal no-bottom-margin\" ng-submit=\"addPid(newPid)\">\n      <div class=\"modal-header\"><h4>Add New Configuration</h4></div>\n      <div class=\"modal-body\">\n        <div class=\"control-group\">\n          <label class=\"control-label\" for=\"newPid\">New configuration ID</label>\n\n          <div class=\"controls\">\n            <input class=\"input-xlarge\" type=\"text\" id=\"newPid\" ng-model=\"newPid\"/>\n          </div>\n        </div>\n      </div>\n      <div class=\"modal-footer\">\n        <input class=\"btn btn-success\" ng-disabled=\"!(newPid !== \'\' && newPid !== undefined)\" type=\"submit\" value=\"Add\">\n        <input class=\"btn btn-primary\" ng-click=\"addPidDialog.close()\" type=\"button\" value=\"Cancel\">\n      </div>\n    </form>\n  </div>\n</div>\n\n");
$templateCache.put("plugins/osgi/html/framework.html","<div class=\"container-fluid\" ng-controller=\"Osgi.FrameworkController\">\n    <h3>Framework Configuration</h3>\n    <div class=\"span11\">\n    <table>\n        <tr>\n            <td><strong>Current Framework Start Level:</strong></td>\n            <td class=\"less-big\">{{startLevel}}</td>\n            <td><button class=\"btn btn-primary\" \n                        ng-click=\"edit(\'FrameworkStartLevel\', \'Framework Start Level\')\" \n                        title=\"Edit framework start level\"\n                        hawtio-show\n                        object-name=\"{{frameworkMBean}}\"\n                        method-name=\"setFrameworkStartLevel\">Edit</button></td>\n        </tr>\n        <tr><td><p></p></td></tr>\n        <tr>\n            <td><strong>Initial Bundle Start Level:</strong></td>\n            <td class=\"less-big\">{{initialBundleStartLevel}}</td>\n            <td><button class=\"btn btn-primary\"\n                        ng-click=\"edit(\'InitialBundleStartLevel\', \'Initial Bundle Start Level\')\" \n                        title=\"Edit initial bundle start level\"\n                        hawtio-show\n                        object-name=\"{{frameworkMBean}}\"\n                        method-name=\"setInitialBundleStartLevel\">Edit</button></td>\n        </tr>\n    </table>\n    </div>\n\n    <div modal=\"editDialog.show\" close=\"editDialog.close()\" options=\"editDialog.options\">\n        <form id=\"myForm\" class=\"form-horizontal no-bottom-margin\" ng-submit=\"editDialog.close()\">\n            <div class=\"modal-header\"><h4>Change {{editDisplayName}}</h4></div>\n            <div class=\"modal-body\">\n                <p>New Start Level (0-100): <input ng-model=\"editResult\" type=\"number\" min=\"0\" max=\"100\" required/></p>\n            </div>\n            <div class=\"modal-footer\">\n                <input class=\"btn\" ng-click=\"editDialog.close()\" type=\"submit\" value=\"Cancel\">\n                <input class=\"btn btn-primary\" ng-click=\"edited(editAttr, editDisplayName, editResult)\" type=\"submit\" value=\"OK\">\n            </div>\n        </form>\n    </div>\n</div>\n");
$templateCache.put("plugins/osgi/html/layoutOsgi.html","<ul class=\"nav nav-tabs\" hawtio-auto-dropdown ng-controller=\"Karaf.NavBarController\">\n  <li ng-class=\'{active : isActive(\"#/osgi/configuration\") || isPrefixActive(\"#/osgi/pid\")}\'>\n      <a ng-href=\"#/osgi/configurations{{hash}}\">Configuration</a>\n  </li>\n  <li ng-class=\'{active : isActive(\"#/osgi/bundle\")}\'>\n      <a ng-href=\"#/osgi/bundle-list{{hash}}\">Bundles</a>\n  </li>\n  <li ng-class=\'{active : isActive(\"#/osgi/features\") || isActive(\"#/osgi/feature\")}\' ng-show=\"isFeaturesEnabled\">\n    <a ng-href=\"#/osgi/features{{hash}}\">Features</a>\n  </li>\n  <li ng-class=\'{active : isActive(\"#/osgi/package\")}\'>\n      <a ng-href=\"#/osgi/packages{{hash}}\">Packages</a>\n  </li>\n  <li ng-class=\'{active : isActive(\"#/osgi/service\")}\'>\n      <a ng-href=\"#/osgi/services{{hash}}\">Services</a>\n  </li>\n  <li ng-class=\'{active : isActive(\"#/osgi/scr-components\")}\' ng-show=\"isScrEnabled\">\n    <a ng-href=\"#/osgi/scr-components{{hash}}\">Declarative Services</a>\n  </li>\n  <li ng-class=\'{active : isActive(\"#/osgi/server\")}\'>\n    <a ng-href=\"#/osgi/server{{hash}}\">Server</a>\n  </li>\n  <li ng-class=\'{active : isActive(\"#/osgi/fwk\")}\'>\n      <a ng-href=\"#/osgi/fwk{{hash}}\">Framework</a>\n  </li>\n  <li ng-class=\'{active : isActive(\"#/osgi/dependencies\")}\'>\n      <a ng-href=\"#/osgi/dependencies{{hash}}\">Dependencies</a>\n  </li>\n\n  <li class=\"dropdown overflow\" style=\"float: right !important; visibility: hidden;\">\n    <a href=\"#\" class=\"dropdown-toggle\" data-toggle=\"dropdown\"><i class=\"icon-chevron-down\"></i></a>\n    <ul class=\"dropdown-menu right\"></ul>\n  </li>\n\n</ul>\n<div class=\"row-fluid\" ng-controller=\"Osgi.TopLevelController\">\n    <div ng-view></div>\n</div>\n\n\n");
$templateCache.put("plugins/osgi/html/package-details.html","<div>\n    <table class=\"overviewSection\">\n        <tr>\n            <td><strong>Name:</strong></td>\n            <td class=\"less-big\">{{row.Name}}\n            </td>\n        </tr>\n        <tr>\n            <td><strong>Version:</strong></td>\n            <td class=\"less-big\">{{row.Version}}\n            </td>\n        </tr>\n        <tr>\n            <td><strong>Removal Pending:</strong></td>\n            <td class=\"less-big\">{{row.RemovalPending}}\n        </tr>\n        <tr>\n            <td><strong>Exporting Bundles:</strong></td>\n            <td>\n                <ul>\n                    <li ng-repeat=\"name in row.ExportingBundles\">\n                        <a href=\'#/osgi/bundle/{{name}}{{hash}}\'>{{name}}</a>\n                    </li>\n                </ul>\n            </td>\n        </tr>\n        <tr>\n            <td><strong>Importing Bundles:</strong></td>\n            <td>\n                <ul>\n                    <li ng-repeat=\"name in row.ImportingBundles\">\n                        <a href=\'#/osgi/bundle/{{name}}{{hash}}\'>{{name}}</a>\n                    </li>\n                </ul>\n            </td>\n        </tr>\n    </table>\n</div>");
$templateCache.put("plugins/osgi/html/package.html","<div class=\"controller-section\" ng-controller=\"Osgi.PackageController\">\n\n<h1>{{row.id}}</h1>\n\n<div ng-include src=\"\'app/osgi/html/package-details.html\'\"></div>\n</div>\n");
$templateCache.put("plugins/osgi/html/packages.html","<script type=\"text/ng-template\" id=\"packageBundlesTemplate\">\n  <table>\n    <tr>\n      <th>Exporting Bundles</th>\n      <th>Importing Bundles</th>\n    </tr>\n    <tr>\n      <td>\n        <ul>\n          <li ng-repeat=\"b in row.ExportingBundles\">\n            <a href=\'#/osgi/bundle/{{b.Identifier}}?\'>{{b.SymbolicName}}</a>\n          </li>\n        </ul>\n      </td>\n      <td>\n        <ul>\n          <li ng-repeat=\"b in row.ImportingBundles\">\n            <a href=\'#/osgi/bundle/{{b.Identifier}}?\'>{{b.SymbolicName}}</a>\n          </li>\n        </ul>\n      </td>\n    </tr>\n  </table>\n</script>\n\n<div class=\"controller-section\" ng-controller=\"Osgi.PackagesController\">\n  <table cellpadding=\"0\" cellspacing=\"0\" border=\"0\"\n         class=\"table table-condensed table-striped table-bordered table-hover\"\n         id=\"grid\">\n    <thead>\n    <tr>\n      <th></th>\n      <th>Name</th>\n      <th>Version</th>\n      <th>Removal Pending</th>\n    </tr>\n    </thead>\n    <tbody>\n  </table>\n</div>\n");
$templateCache.put("plugins/osgi/html/pid-details.html","<div>\n  <h4 title=\"{{metaType.description}}\">{{zkPid || metaType.name || pid}}\n    <span ng-show=\"factoryInstanceName\">: {{factoryInstanceName}}</span>\n  </h4>\n\n  <div ng-hide=\"editMode\">\n    <div class=\"row-fluid\">\n      <button class=\"btn\" ng-click=\"setEditMode(true)\" title=\"Edit this configuration\" hawtio-show object-name=\"{{hawtioConfigAdminMBean}}\" method-name=\"configAdminUpdate\"><i class=\"icon-edit\"></i> Edit</button>\n      <button class=\"btn btn-danger pull-right\" ng-click=\"deletePidDialog.open()\" title=\"Delete this configuration\" hawtio-show object-name=\"{{configAdminMBean}}\" method-name=\"delete\"><i class=\"icon-remove\"></i> Delete</button>\n    </div>\n    <div class=\"row-fluid config-admin-form view\">\n      <div simple-form name=\"pidEditor\" mode=\'view\' entity=\'entity\' data=\'schema\' schema=\"fullSchema\"></div>\n    </div>\n  </div>\n  <div ng-show=\"editMode\">\n    <div class=\"row-fluid\">\n      <button ng-show=\"newPid\" class=\"btn btn-primary\" ng-disabled=\"!canSave || !createForm.pidInstanceName\" ng-click=\"pidSave()\"><i class=\"icon-save\"></i> Create</button>\n      <button ng-hide=\"newPid\" class=\"btn btn-primary\" ng-disabled=\"!canSave\" ng-click=\"pidSave()\"><i class=\"icon-save\"></i> Save</button>\n      <button class=\"btn btn-warning\" ng-click=\"setEditMode(false)\"><i class=\"icon-remove\"></i> Cancel</button>\n      <button class=\"btn pull-right\" ng-click=\"addPropertyDialog.open()\" title=\"Add a new property value to this configuration\"><i class=\"icon-plus\"></i> Property</button>\n    </div>\n    <div class=\"row-fluid config-admin-form edit\">\n      <div ng-show=\"newPid\" class=\"new-config-name-form\">\n        <form class=\"form-horizontal\" action=\"\">\n          <fieldset>\n            <div class=\"control-group\">\n              <label class=\"control-label\" title=\"The name of the configuration file\">Configuration name: </label>\n              <div class=\"controls\">\n                <input type=\"text\" class=\"span12\"\n                       title=\"The name of the configuration file\"\n                       ng-required=\"true\"\n                       ng-model=\"createForm.pidInstanceName\" name=\"path\"\n                       autofocus=\"autofocus\">\n              </div>\n            </div>\n          </fieldset>\n        </form>\n      </div>\n\n      <div simple-form name=\"pidEditor\" mode=\'edit\' entity=\'entity\' data=\'schema\' schema=\"fullSchema\" onSubmit=\"pidSave()\"></div>\n    </div>\n  </div>\n\n  <div modal=\"deletePropDialog.show\" close=\"deletePropDialog.close()\" options=\"deletePropDialog.options\">\n    <form name=\"deleteProperty\" class=\"form-horizontal no-bottom-margin\" ng-submit=\"deletePidPropConfirmed()\">\n      <div class=\"modal-header\"><h4>Delete property \'{{deleteKey}}\'</h4></div>\n      <div class=\"modal-body\">\n        <p>Are you sure?</p>\n      </div>\n      <div class=\"modal-footer\">\n        <input class=\"btn btn-success\" type=\"submit\" value=\"Delete\">\n        <input class=\"btn btn-primary\" ng-click=\"deletePropDialog.close()\" type=\"button\" value=\"Cancel\">\n      </div>\n    </form>\n  </div>\n\n  <div modal=\"deletePidDialog.show\" close=\"deletePidDialog.close()\" options=\"deletePidDialog.options\">\n    <form name=\"deletePid\" class=\"form-horizontal no-bottom-margin\" ng-submit=\"deletePidConfirmed()\">\n      <div class=\"modal-header\"><h4>Delete configuration: {{pid}}</h4></div>\n      <div class=\"modal-body\">\n        <p>Are you sure?</p>\n      </div>\n      <div class=\"modal-footer\">\n        <input class=\"btn btn-success\" type=\"submit\" value=\"Delete\">\n        <input class=\"btn btn-primary\" ng-click=\"deletePidDialog.close()\" type=\"button\" value=\"Cancel\">\n      </div>\n    </form>\n  </div>\n\n  <div modal=\"addPropertyDialog.show\" close=\"addPropertyDialog.close()\" options=\"addPropertyDialog.options\">\n    <form name=\"addProperty\" class=\"form-horizontal no-bottom-margin\"\n          ng-submit=\"addPropertyConfirmed(addPropKey, addPropValue)\">\n      <div class=\"modal-header\"><h4>Add property</h4></div>\n      <div class=\"modal-body\">\n        <div class=\"control-group\">\n          <label class=\"control-label\" for=\"propKey\">Key</label>\n\n          <div class=\"controls\">\n            <input class=\"input-xlarge\" type=\"text\" id=\"propKey\" placeholder=\"Key\" ng-model=\"addPropKey\"/>\n            <span class=\"help-block\"\n                  ng-hide=\"addPropKey !== \'\' && addPropKey !== undefined\">A key must be specified</span>\n          </div>\n        </div>\n        <div class=\"control-group\">\n          <label class=\"control-label\" for=\"propValue\">Value</label>\n\n          <div class=\"controls\">\n            <input class=\"input-xlarge\" type=\"text\" id=\"propValue\" placeholder=\"Value\" ng-model=\"addPropValue\"/>\n          </div>\n        </div>\n      </div>\n      <div class=\"modal-footer\">\n        <input class=\"btn btn-success\" ng-disabled=\"!(addPropKey !== \'\' && addPropKey !== undefined)\" type=\"submit\"\n               value=\"Add\">\n        <input class=\"btn btn-primary\" ng-click=\"addPropertyDialog.close()\" type=\"button\" value=\"Cancel\">\n      </div>\n    </form>\n  </div>\n</div>\n");
$templateCache.put("plugins/osgi/html/pid.html","<div class=\"controller-section\" ng-controller=\"Osgi.PidController\">\n  <div ng-include src=\"\'app/osgi/html/pid-details.html\'\"></div>\n</div>\n");
$templateCache.put("plugins/osgi/html/services.html","<script type=\"text/ng-template\" id=\"osgiServiceTemplate\">\n  <table>\n    <tr>\n      <th>Using Bundles</th>\n    </tr>\n    <tr>\n      <td>\n        <ul>\n          <li ng-repeat=\"b in row.UsingBundles\">\n            <a href=\'#/osgi/bundle/{{b.Identifier}}{{hash}}\'>{{b.SymbolicName}}</a>\n          </li>\n        </ul>\n      </td>\n    </tr>\n  </table>\n</script>\n\n<div class=\"controller-section\" ng-controller=\"Osgi.ServiceController\">\n\n  <table cellpadding=\"0\" cellspacing=\"0\" border=\"0\"\n         class=\"table table-condensed table-striped table-bordered table-hover\"\n         id=\"grid\">\n    <thead>\n    <tr>\n      <th></th>\n      <th>ID</th>\n      <th>Bundle</th>\n      <th>Object Class(es)</th>\n    </tr>\n    </thead>\n    <tbody>\n  </table>\n</div>\n");
$templateCache.put("plugins/osgi/html/svc-dependencies.html","<style type=\"text/css\">\n\n    div#pop-up {\n        display: none;\n        position:absolute;\n        color: white;\n        font-size: 14px;\n        background: rgba(0,0,0,0.6);\n        padding: 5px 10px 5px 10px;\n        -moz-border-radius: 8px 8px;\n        border-radius: 8px 8px;\n    }\n\n    div#pop-up-title {\n        font-size: 15px;\n        margin-bottom: 4px;\n        font-weight: bolder;\n    }\n    div#pop-up-content {\n        font-size: 12px;\n    }\n\n    rect.graphbox {\n        fill: #DDD;\n    }\n\n    rect.graphbox.frame {\n        stroke: #222;\n        stroke-width: 2px\n    }\n\n    path.link {\n        fill: none;\n        stroke: #666;\n        stroke-width: 1.5px;\n    }\n\n    path.link.registered {\n        stroke: #444;\n    }\n\n    path.link.inuse {\n        stroke-dasharray: 0,2 1;\n    }\n\n    circle {\n        fill: #black;\n    }\n\n    circle.service {\n        fill: blue;\n    }\n\n    circle.bundle {\n        fill: black;\n    }\n\n    circle.package {\n        fill: gray;\n    }\n\n    text {\n        font: 10px sans-serif;\n        pointer-events: none;\n    }\n\n    text.shadow {\n        stroke: #fff;\n        stroke-width: 3px;\n        stroke-opacity: .8;\n    }\n\n</style>\n\n<div ng-controller=\"Osgi.ServiceDependencyController\">\n\n    <div class=\"pull-left\">\n        <form class=\"form-inline no-bottom-margin\">\n            <fieldset>\n                <div class=\"control-group inline-block\">\n                    <input type=\"text\" class=\"search-query\" placeholder=\"Filter Bundle Symbolic Name...\" ng-model=\"bundleFilter\">\n                    <input type=\"text\" class=\"search-query\" placeholder=\"Filter Package Name...\" ng-model=\"packageFilter\" ng-change=\"updatePkgFilter()\">\n                    <label class=\"radio\" for=\"showServices\">\n                        <input id=\"showServices\" type=\"radio\" value=\"services\" ng-model=\"selectView\"> Show Services\n                    </label>\n                    <label class=\"radio\" for=\"showPackages\">\n                        <input id=\"showPackages\" type=\"radio\" value=\"packages\" ng-model=\"selectView\" ng-disabled=\"disablePkg\"> Show Packages\n                    </label>\n                    <label class=\"checkbox\" for=\"hideUnused\">\n                        <input id=\"hideUnused\" type=\"checkbox\" ng-model=\"hideUnused\"> Hide Unused\n                    </label>\n                    <button class=\"btn btn-primary\" ng-click=\"updateGraph()\" title=\"Apply the selected criteria to the Graph.\">Apply</button>\n                </div>\n            </fieldset>\n        </form>\n    </div>\n\n  <div ng-hide=\"inDashboard\" class=\"add-link\">\n    <a ng-href=\"{{addToDashboardLink()}}\" title=\"Add this view to a Dashboard\"><i class=\"icon-share\"></i></a>\n  </div>\n\n    <div id=\"pop-up\">\n        <div id=\"pop-up-title\"></div>\n        <div id=\"pop-up-content\"></div>\n    </div>\n\n  <div class=\"row-fluid\">\n    <div class=\"span12 canvas\" style=\"min-height: 800px\">\n      <div hawtio-force-graph graph=\"graph\" link-distance=\"100\" charge=\"-300\" nodesize=\"6\"></div>\n    </div>\n  </div>\n\n</div>\n");
$templateCache.put("plugins/wiki/exemplar/document.html","<h2>This is a title</h2>\n\n<p>Here are some notes</p>");
$templateCache.put("plugins/wiki/html/camelCanvas.html","<div ng-controller=\"Wiki.CamelController\">\n\n  <div class=\"wiki-fixed\" ng-controller=\"Wiki.CamelCanvasController\">\n    <ng-include src=\"\'app/wiki/html/camelNavBar.html\'\"></ng-include>\n\n    <script type=\"text/ng-template\"\n            id=\"nodeTemplate\">\n      <div class=\"component window\"\n           id=\"{{id}}\"\n           title=\"{{node.tooltip}}\">\n        <div class=\"window-inner {{node.type}}\">\n          <img class=\"nodeIcon\"\n               title=\"Click and drag to create a connection\"\n               src=\"{{node.imageUrl}}\">\n          <span class=\"nodeText\"\n                title=\"{{node.label}}\">{{node.label}}</span>\n        </div>\n      </div>\n    </script>\n\n\n    <div class=\"row-fluid\">\n      <div class=\"span12\">\n        <ul class=\"nav nav-tabs\">\n          <li ng-class=\"{active : true}\">\n            <a ng-href=\'{{startLink}}/camel/canvas/{{pageId}}\' title=\"Edit the diagram in a draggy droppy way\"\n               data-placement=\"bottom\">\n              <i class=\"icon-picture\"></i> Canvas</a></li>\n          <li ng-class=\"{active : false}\">\n            <a ng-href=\'{{startLink}}/camel/properties/{{pageId}}\' title=\"Switch to the tree based view\"\n               data-placement=\"bottom\">\n              <i class=\"icon-sitemap\"></i> Tree</a></li>\n\n          <li class=\"pull-right\">\n            <a href=\'\' title=\"Add new pattern node connecting to this pattern\" ng-click=\"addDialog.open()\"\n               data-placement=\"bottom\">\n              <i class=\"icon-plus\"></i> Add</a></li>\n\n          <li class=\"pull-right\">\n            <a href=\'\' title=\"Automatically layout the diagram \" ng-click=\"doLayout()\"\n               data-placement=\"bottom\">\n              <i class=\"icon-magic\"></i> Layout</a></li>\n\n          <li class=\"pull-right\" style=\"margin-top: 0; margin-bottom: 0;\">\n            </li>\n\n          <!--\n          <li class=\"pull-right\">\n            <a href=\'\' title=\"Edit the properties for the selected node\" ng-disabled=\"!selectedFolder\"\n               ng-click=\"propertiesDialog.open()\"\n               data-placement=\"bottom\">\n              <i class=\"icon-edit\"></i> Properties</a></li>\n              -->\n        </ul>\n\n        <div class=\"modal-large\">\n          <div modal=\"addDialog.show\" close=\"addDialog.close()\" ng-options=\"addDialog.options\">\n            <form class=\"form-horizontal no-bottom-margin\" ng-submit=\"addAndCloseDialog()\">\n              <div class=\"modal-header\"><h4>Add Node</h4></div>\n              <div class=\"modal-body\">\n                <tabset>\n                  <tab heading=\"Patterns\">\n                    <div hawtio-tree=\"paletteTree\" hideRoot=\"true\" onSelect=\"onPaletteSelect\"\n                         activateNodes=\"paletteActivations\"></div>\n                  </tab>\n                  <tab heading=\"Endpoints\">\n                    <div hawtio-tree=\"componentTree\" hideRoot=\"true\" onSelect=\"onComponentSelect\"\n                         activateNodes=\"componentActivations\"></div>\n                  </tab>\n                </tabset>\n              </div>\n              <div class=\"modal-footer\">\n                <input id=\"submit\" class=\"btn btn-primary add\" type=\"submit\" ng-disabled=\"!selectedPaletteNode && !selectedComponentNode\"\n                       value=\"Add\">\n                <button class=\"btn btn-warning cancel\" type=\"button\" ng-click=\"addDialog.close()\">Cancel</button>\n              </div>\n            </form>\n          </div>\n        </div>\n\n\n        <!--\n        <div modal=\"propertiesDialog.show\" close=\"propertiesDialog.close()\" ng-options=\"propertiesDialog.options\">\n          <form class=\"form-horizontal no-bottom-margin\" ng-submit=\"updatePropertiesAndCloseDialog()\">\n            <div class=\"modal-header\"><h4>Properties</h4></div>\n            <div class=\"modal-body\">\n\n              <div ng-show=\"!selectedEndpoint\"> -->\n                <!-- pattern form --> <!--\n                <div simple-form name=\"formEditor\" entity=\'nodeData\' data=\'nodeModel\' schema=\"schema\"\n                     onsubmit=\"updatePropertiesAndCloseDialog\"></div>\n              </div>\n              <div ng-show=\"selectedEndpoint\"> -->\n                <!-- endpoint form -->\n                <!--\n                <div class=\"control-group\">\n                  <label class=\"control-label\" for=\"endpointPath\">Endpoint</label>\n\n                  <div class=\"controls\">\n                    <input id=\"endpointPath\" class=\"span10\" type=\"text\" ng-model=\"endpointPath\" placeholder=\"name\"\n                           typeahead=\"title for title in endpointCompletions($viewValue) | filter:$viewValue\"\n                           typeahead-editable=\'true\'\n                           min-length=\"1\">\n                  </div>\n                </div>\n                <div simple-form name=\"formEditor\" entity=\'endpointParameters\' data=\'endpointSchema\'\n                     schema=\"schema\"></div>\n              </div>\n\n\n            </div>\n            <div class=\"modal-footer\">\n              <input class=\"btn btn-primary add\" type=\"submit\" ng-click=\"updatePropertiesAndCloseDialog()\" value=\"OK\">\n              <button class=\"btn btn-warning cancel\" type=\"button\" ng-click=\"propertiesDialog.close()\">Cancel</button>\n            </div>\n          </form>\n        </div>\n        -->\n\n      </div>\n    </div>\n\n    <div class=\"row-fluid\">\n    </div>\n\n    <div class=\"panes gridStyle\">\n      <div class=\"left-pane\">\n        <div class=\"camel-viewport camel-canvas\">\n          <div style=\"position: relative;\" class=\"canvas\"></div>\n        </div>\n      </div>\n      <div class=\"right-pane\">\n        <div class=\"camel-props\">\n          <div class=\"button-bar\">\n            <div class=\"centered\">\n              <form class=\"form-inline\">\n                <label>Route: </label>\n                <select ng-model=\"selectedRouteId\" ng-options=\"routeId for routeId in routeIds\"></select>\n              </form>\n              <div class=\"btn-group\">\n                <button class=\"btn\"\n                        title=\"{{getDeleteTitle()}}\"\n                        ng-click=\"removeNode()\"\n                        data-placement=\"bottom\">\n                    <i class=\"icon-remove\"></i> Delete {{getDeleteTarget()}}</button>\n                <button class=\"btn\"\n                        title=\"Apply any changes to the endpoint properties\"\n                        ng-disabled=\"!isFormDirty()\"\n                        ng-click=\"updateProperties()\">\n                    <i class=\"icon-ok\"></i> Apply</button>\n                <!-- TODO Would be good to have this too\n                <button class=\"btn\"\n                        title=\"Clear any changes to the endpoint properties\"\n                        ng-disabled=\"!isFormDirty()\"\n                        ng-click=\"resetForms()\">\n                  <i class=\"icon-remove\"></i> Cancel</button> -->\n              </div>\n            </div>\n          </div>\n          <div class=\"prop-viewport\">\n\n            <div>\n              <!-- pattern form -->\n              <div ng-show=\"!selectedEndpoint\">\n                <div simple-form\n                     name=\"formEditor\"\n                     entity=\'nodeData\'\n                     data=\'nodeModel\'\n                     schema=\"schema\"\n                     onsubmit=\"updateProperties\"></div>\n              </div>\n\n              <!-- endpoint form -->\n              <div class=\"endpoint-props\" ng-show=\"selectedEndpoint\">\n                <p>Endpoint</p>\n                <form name=\"endpointForm\">\n                  <div class=\"control-group\">\n                    <label class=\"control-label\" for=\"endpointPath\">URI:</label>\n\n                    <div class=\"controls\">\n                      <input id=\"endpointPath\" class=\"span10\" type=\"text\" ng-model=\"endpointPath\" placeholder=\"name\"\n                             typeahead=\"title for title in endpointCompletions($viewValue) | filter:$viewValue\"\n                             typeahead-editable=\'true\'\n                             min-length=\"1\">\n                    </div>\n                  </div>\n                </form>\n\n                <div simple-form\n                     name=\"formEditor\"\n                     entity=\'endpointParameters\'\n                     data=\'endpointSchema\'\n                     schema=\"schema\"\n                     onsubmit=\"updateProperties\"></div>\n              </div>\n\n            </div>\n          </div>\n        </div>\n      </div>\n    </div>\n  </div>\n</div>\n");
$templateCache.put("plugins/wiki/html/camelDiagram.html","<div ng-include=\"diagramTemplate\"></div>\n");
$templateCache.put("plugins/wiki/html/camelNavBar.html","<div class=\"logbar\" ng-controller=\"Wiki.NavBarController\">\n  <div class=\"wiki logbar-container\">\n    <ul class=\"nav nav-tabs connected\">\n      <li ng-repeat=\"link in breadcrumbs\" ng-class=\'{active : isActive(link.href)}\'>\n        <a ng-href=\"{{link.href}}{{hash}}\">{{link.name}}</a>\n      </li>\n\n      <!--\n              <li class=\"pull-right\">\n                <a ng-href=\"{{editLink()}}{{hash}}\" ng-hide=\"!editLink()\" title=\"Edit this camel configuration\"\n                   data-placement=\"bottom\">\n                  <i class=\"icon-edit\"></i> Edit</a></li>\n              <li class=\"pull-right\" ng-show=\"sourceLink()\">\n      -->\n      <li class=\"pull-right\">\n        <a href=\"\" id=\"saveButton\" ng-disabled=\"!modified\" ng-click=\"save()\"\n           ng-class=\"{\'nav-primary\' : modified}\"\n           title=\"Saves the Camel document\">\n          <i class=\"icon-save\"></i> Save</a>\n      </li>\n      <li class=\"pull-right\">\n        <a href=\"\" id=\"cancelButton\" ng-click=\"cancel()\"\n           title=\"Discards any updates\">\n          <i class=\"icon-remove\"></i> Cancel</a>\n      </li>\n\n      <li class=\"pull-right\">\n        <a ng-href=\"{{sourceLink()}}\" title=\"View source code\"\n           data-placement=\"bottom\">\n          <i class=\"icon-file-alt\"></i> Source</a>\n      </li>\n    </ul>\n  </div>\n</div>\n");
$templateCache.put("plugins/wiki/html/camelProperties.html","<div class=\"row-fluid\">\n  <div class=\"wiki-fixed\" ng-controller=\"Wiki.CamelController\">\n\n    <ng-include src=\"\'app/wiki/html/camelNavBar.html\'\"></ng-include>\n\n    <div class=\"row-fluid\">\n      <div class=\"span12\" ng-include=\"\'app/wiki/html/camelSubLevelTabs.html\'\"></div>\n    </div>\n\n    <div class=\"row-fluid\">\n      <div id=\"tree-container\" class=\"span3\" ng-controller=\"Camel.TreeController\">\n        <div hawtio-tree=\"camelContextTree\" onselect=\"onNodeSelect\" onDragEnter=\"onNodeDragEnter\" onDrop=\"onNodeDrop\"\n             onRoot=\"onRootTreeNode\"\n             hideRoot=\"true\"></div>\n      </div>\n\n      <div class=\"span9\">\n        <div ng-include=\"propertiesTemplate\"></div>\n      </div>\n    </div>\n  </div>\n</div>\n\n\n");
$templateCache.put("plugins/wiki/html/camelPropertiesEdit.html","<div simple-form name=\"formEditor\" entity=\'nodeData\' data=\'nodeModel\' schema=\"schema\"></div>\n");
$templateCache.put("plugins/wiki/html/camelSubLevelTabs.html","<ul class=\"nav nav-tabs\">\n  <li ng-repeat=\"nav in camelSubLevelTabs\" ng-show=\"isValid(nav)\" ng-class=\"{active : isActive(nav)}\">\n    <a ng-href=\"{{nav.href()}}{{hash}}\" title=\"{{nav.title}}\"\n       data-placement=\"bottom\" ng-bind-html-unsafe=\"nav.content\"></a></li>\n\n  <li class=\"pull-right\">\n    <a href=\'\' title=\"Add new pattern node connecting to this pattern\" ng-click=\"addNode()\" data-placement=\"bottom\">\n      <i class=\"icon-plus\"></i> Add</a></li>\n  <li class=\"pull-right\">\n    <a href=\'\' title=\"Deletes the selected pattern\" ng-disabled=\"!canDelete()\" ng-click=\"removeNode()\" data-placement=\"bottom\">\n      <i class=\"icon-remove\"></i> Delete</a></li>\n</ul>\n\n<div modal=\"addDialog.show\" close=\"addDialog.close()\" ng-options=\"addDialog.options\">\n  <form class=\"form-horizontal no-bottom-margin\" ng-submit=\"addAndCloseDialog()\">\n    <div class=\"modal-header\"><h4>Add Node</h4></div>\n    <div class=\"modal-body\">\n      <div hawtio-tree=\"paletteTree\" hideRoot=\"true\" onSelect=\"onPaletteSelect\" activateNodes=\"paletteActivations\"></div>\n    </div>\n    <div class=\"modal-footer\">\n      <input id=\"submit\" class=\"btn btn-primary add\" type=\"submit\" ng-disabled=\"!selectedPaletteNode\" value=\"Add\">\n      <button class=\"btn btn-warning cancel\" type=\"button\" ng-click=\"addDialog.close()\">Cancel</button>\n      </div>\n    </form>\n  </div>\n</div>\n");
$templateCache.put("plugins/wiki/html/commit.html","<link rel=\"stylesheet\" href=\"app/wiki/css/wiki.css\" type=\"text/css\"/>\n\n<div ng-controller=\"Wiki.CommitController\">\n  <script type=\"text/ng-template\" id=\"fileCellTemplate.html\">\n    <div class=\"ngCellText\">\n      <a ng-href=\"{{row.entity.fileLink}}\" class=\"file-name\"\n         title=\"{{row.entity.title}}\">\n        <span class=\"file-icon\" ng-class=\"row.entity.fileClass\" ng-bind-html-unsafe=\"row.entity.fileIconHtml\"></span>\n        <span ng-class=\"row.entity.changeClass\">{{row.entity.path}}</span>\n      </a>\n    </div>\n  </script>\n\n  <div ng-hide=\"inDashboard\" class=\"logbar\" ng-controller=\"Wiki.NavBarController\">\n    <div class=\"wiki logbar-container\">\n      <ul class=\"nav nav-tabs\">\n        <li ng-show=\"branches.length || branch\" class=\"dropdown\">\n          <a href=\"#\" class=\"dropdown-toggle\" data-toggle=\"dropdown\"\n             title=\"The branch to view\">\n            {{branch || \'branch\'}}\n            <span class=\"caret\"></span>\n          </a>\n          <ul class=\"dropdown-menu\">\n            <li ng-repeat=\"otherBranch in branches\">\n              <a ng-href=\"{{branchLink(otherBranch)}}{{hash}}\"\n                 ng-hide=\"otherBranch === branch\"\n                 title=\"Switch to the {{otherBranch}} branch\"\n                 data-placement=\"bottom\">\n                {{otherBranch}}</a>\n            </li>\n          </ul>\n        </li>\n        <li ng-repeat=\"link in breadcrumbs\">\n          <a ng-href=\"{{link.href}}{{hash}}\">{{link.name}}</a>\n        </li>\n        <li>\n          <a ng-href=\"{{historyLink}}{{hash}}\">History</a>\n        </li>\n        <li title=\"{{commitInfo.shortMessage}}\" class=\"active\">\n          <a class=\"commit-id\">{{commitInfo.commitHashText}}</a>\n        </li>\n        <li class=\"pull-right\">\n        <span class=\"commit-author\">\n          <i class=\"icon-user\"></i> {{commitInfo.author}}\n        </span>\n        </li>\n        <li class=\"pull-right\">\n          <span class=\"commit-date\">{{commitInfo.date | date: dateFormat}}</span>\n        </li>\n      </ul>\n    </div>\n  </div>\n\n  <div class=\"wiki-fixed row-fluid\">\n    <div class=\"commit-message\" title=\"{{commitInfo.shortMessage}}\">\n      {{commitInfo.trimmedMessage}}\n    </div>\n  </div>\n\n  <div class=\"row-fluid\">\n    <div class=\"span4\">\n      <div class=\"control-group\">\n        <button class=\"btn\" ng-disabled=\"!selectedItems.length\" ng-click=\"diff()\"\n                title=\"Compare the selected versions of the files to see how they differ\"><i class=\"icon-exchange\"></i>\n          Compare\n        </button>\n\n        <!--\n                <button class=\"btn\" ng-disabled=\"!canRevert()\" ng-click=\"revert()\"\n                        title=\"Revert to this version of the file\"><i class=\"icon-exchange\"></i> Revert\n                </button>\n        -->\n      </div>\n    </div>\n    <div class=\"span8\">\n      <div class=\"control-group\">\n        <input class=\"span12 search-query\" type=\"text\" ng-model=\"gridOptions.filterOptions.filterText\"\n               placeholder=\"search\">\n      </div>\n    </div>\n  </div>\n\n  <div class=\"form-horizontal\">\n    <div class=\"row-fluid\">\n      <table class=\"table-condensed table-striped\" hawtio-simple-table=\"gridOptions\"></table>\n    </div>\n  </div>\n\n</div>\n");
$templateCache.put("plugins/wiki/html/configuration.html","<div ng-hide=\"inDashboard\" class=\"logbar\" ng-controller=\"Wiki.NavBarController\">\n  <div class=\"wiki logbar-container\">\n    <ul class=\"nav nav-tabs\">\n      <li ng-show=\"branches.length || branch\" class=\"dropdown\">\n        <a href=\"#\" class=\"dropdown-toggle\" data-toggle=\"dropdown\"\n           title=\"The branch to view\">\n          {{branch || \'branch\'}}\n          <span class=\"caret\"></span>\n        </a>\n        <ul class=\"dropdown-menu\">\n          <li ng-repeat=\"otherBranch in branches\">\n            <a ng-href=\"{{branchLink(otherBranch)}}{{hash}}\"\n               ng-hide=\"otherBranch === branch\"\n               title=\"Switch to the {{otherBranch}} branch\"\n               data-placement=\"bottom\">\n              {{otherBranch}}</a>\n          </li>\n        </ul>\n      </li>\n      <li ng-repeat=\"link in breadcrumbs\">\n        <a ng-href=\"{{link.href}}{{hash}}\">{{link.name}}</a>\n      </li>\n      <li class=\"ng-scope\">\n        <a ng-href=\"{{startLink}}/configurations/{{pageId}}\">configuration</a>\n      </li>\n      <li class=\"ng-scope active\">\n        <a>pid</a>\n      </li>\n    </ul>\n  </div>\n</div>\n<div class=\"wiki-fixed\">\n  <div class=\"controller-section\" ng-controller=\"Osgi.PidController\">\n    <div ng-include src=\"\'app/osgi/html/pid-details.html\'\"></div>\n  </div>\n</div>\n");
$templateCache.put("plugins/wiki/html/configurations.html","<div ng-hide=\"inDashboard\" class=\"logbar\" ng-controller=\"Wiki.NavBarController\">\n  <div class=\"wiki logbar-container\">\n    <ul class=\"nav nav-tabs\">\n      <li ng-show=\"branches.length || branch\" class=\"dropdown\">\n        <a href=\"#\" class=\"dropdown-toggle\" data-toggle=\"dropdown\"\n           title=\"The branch to view\">\n          {{branch || \'branch\'}}\n          <span class=\"caret\"></span>\n        </a>\n        <ul class=\"dropdown-menu\">\n          <li ng-repeat=\"otherBranch in branches\">\n            <a ng-href=\"{{branchLink(otherBranch)}}{{hash}}\"\n               ng-hide=\"otherBranch === branch\"\n               title=\"Switch to the {{otherBranch}} branch\"\n               data-placement=\"bottom\">\n              {{otherBranch}}</a>\n          </li>\n        </ul>\n      </li>\n      <li ng-repeat=\"link in breadcrumbs\">\n        <a ng-href=\"{{link.href}}{{hash}}\">{{link.name}}</a>\n      </li>\n      <li class=\"ng-scope active\">\n        <a>configuration</a>\n      </li>\n    </ul>\n  </div>\n</div>\n\n<div class=\"wiki-fixed\">\n  <div ng-include src=\"\'app/osgi/html/configurations.html\'\"></div>\n</div>\n");
$templateCache.put("plugins/wiki/html/create.html","<div class=\"row-fluid\" ng-controller=\"Wiki.CreateController\">\n  <div class=\"row-fluid\">\n    <div class=\"span12\">\n      <form name=\"createForm\"\n            novalidate\n            class=\"form-horizontal no-bottom-margin\"\n            ng-submit=\"addAndCloseDialog(newDocumentName)\">\n        <fieldset>\n\n          <div class=\"row-fluid\">\n            <div class=\"span12\">\n              <h4>Create Document</h4>\n            </div>\n          </div>\n\n          <div class=\"row-fluid\">\n            <div class=\"span2\">\n            </div>\n            <div class=\"span4\">\n              <div hawtio-tree=\"createDocumentTree\"\n                     hideRoot=\"true\"\n                     onSelect=\"onCreateDocumentSelect\"\n                     activateNodes=\"createDocumentTreeActivations\"></div>\n            </div>\n            <div class=\"span4\">\n              <div class=\"row-fluid\">\n                <div class=\"well\">\n                  {{selectedCreateDocumentTemplate.tooltip}}\n                </div>\n              </div>\n              <div class=\"row-fluid\">\n                <div ng-show=\"fileExists.exists\" class=\"alert\">\n                  Please choose a different name as <b>{{fileExists.name}}</b> already exists\n                </div>\n                <div ng-show=\"fileExtensionInvalid\" class=\"alert\">\n                  {{fileExtensionInvalid}}\n                </div>\n                <div ng-show=\"!createForm.$valid\" class=\"alert\">\n                  {{selectedCreateDocumentTemplateInvalid}}\n                </div>\n                <div class=\"control-group\">\n                  <label class=\"control-label\" for=\"fileName\">Name: </label>\n                  <div class=\"controls\">\n                    <input name=\"fileName\" id=\"fileName\"\n                           class=\"input-xlarge\"\n                           type=\"text\"\n                           ng-pattern=\"selectedCreateDocumentTemplateRegex\"\n                           ng-model=\"newDocumentName\"\n                           placeholder=\"{{selectedCreateDocumentTemplate.exemplar}}\">\n                  </div>\n                </div>\n              </div>\n              <div class=\"row-fluid\">\n                <div simple-form data=\"formSchema\" entity=\"formData\" onSubmit=\"generate()\"></div>\n              </div>\n              <div class=\"row-fluid\">\n                <input class=\"btn btn-primary add pull-right\"\n                       type=\"submit\"\n                       ng-disabled=\"!selectedCreateDocumentTemplate.exemplar || !createForm.$valid\"\n                       value=\"Create\">\n                <span class=\"pull-right\">&nbsp;</span>\n                <button class=\"btn btn-warning cancel pull-right\" type=\"button\" ng-click=\"cancel()\">Cancel</button>\n              </div>\n            </div>\n            <div class=\"span2\">\n            </div>\n          </div>\n        </fieldset>\n      </form>\n    </div>\n  </div>\n\n</div>\n");
$templateCache.put("plugins/wiki/html/createPage.html","<div ng-controller=\"Wiki.EditController\">\n  <div class=\"logbar\" ng-controller=\"Wiki.NavBarController\">\n\n    <div class=\"wiki logbar-container\">\n\n      <ul class=\"connected nav nav-tabs\">\n        <li ng-repeat=\"link in breadcrumbs\" ng-class=\'{active : isActive(link.href)}\'>\n          <a ng-href=\"{{link.href}}{{hash}}\">\n            {{link.name}}\n          </a>\n        </li>\n\n        <li class=\"pull-right\">\n\n          <a href=\"\" id=\"cancelButton\" ng-click=\"cancel()\"\n                  class=\"pull-right\"\n                  title=\"Discards any updates\">\n            <i class=\"icon-remove\"></i> Cancel\n          </a>\n        </li>\n\n        <li class=\"pull-right\">\n          <a href=\"\" id=\"saveButton\" ng-show=\"isValid()\" ng-click=\"create()\"\n                  class=\"pull-right\"\n                  title=\"Creates this page and saves it in the wiki\">\n            <i class=\"icon-file-alt\"></i> Create\n          </a>\n        </li>\n\n      </ul>\n    </div>\n  </div>\n\n  <div class=\"wiki-fixed form-horizontal\">\n    <div class=\"control-group\">\n      <input type=\"text\" ng-model=\"fileName\" placeholder=\"File name\" class=\"span12\"/>\n    </div>\n    <div class=\"control-group\">\n      <div ng-include=\"sourceView\" class=\"editor-autoresize\"></div>\n    </div>\n  </div>\n</div>\n");
$templateCache.put("plugins/wiki/html/dozerMappings.html","<div class=\"wiki-fixed\" ng-controller=\"Wiki.DozerMappingsController\">\n  <div class=\"logbar\" ng-controller=\"Wiki.NavBarController\">\n    <div class=\"wiki logbar-container\">\n      <ul class=\"nav nav-tabs connected\">\n        <li ng-repeat=\"link in breadcrumbs\" ng-class=\'{active : isActive(link.href)}\'>\n          <a ng-href=\"{{link.href}}{{hash}}\">{{link.name}}</a>\n        </li>\n\n        <!--\n                <li class=\"pull-right\">\n                  <a ng-href=\"{{editLink()}}{{hash}}\" ng-hide=\"!editLink()\" title=\"Edit this camel configuration\"\n                     data-placement=\"bottom\">\n                    <i class=\"icon-edit\"></i> Edit</a></li>\n                <li class=\"pull-right\" ng-show=\"sourceLink()\">\n        -->\n        <li class=\"pull-right\">\n          <a href=\"\" id=\"saveButton\" ng-disabled=\"!isValid()\" ng-click=\"save()\"\n             ng-class=\"{\'nav-primary\' : modified}\"\n             title=\"Saves the Mappings document\">\n            <i class=\"icon-save\"></i> Save</a>\n        </li>\n        <li class=\"pull-right\">\n          <a href=\"\" id=\"cancelButton\" ng-click=\"cancel()\"\n             title=\"Discards any updates\">\n            <i class=\"icon-remove\"></i> Cancel</a>\n        </li>\n\n        <li class=\"pull-right\">\n          <a ng-href=\"{{sourceLink()}}\" title=\"View source code\"\n             data-placement=\"bottom\">\n            <i class=\"icon-file-alt\"></i> Source</a>\n        </li>\n      </ul>\n    </div>\n  </div>\n\n  <div class=\"tabbable hawtio-form-tabs\" ng-model=\"tab\" ng-hide=\"missingContainer\">\n\n    <div class=\"tab-pane\" title=\"Mappings\">\n\n      <div class=\"row-fluid\">\n        <div class=\"span12 centered spacer\">\n          <select class=\"no-bottom-margin\" ng-model=\"selectedMapping\" ng-options=\"m.map_id for m in mappings\"></select>\n          <button class=\"btn\"\n                  ng-click=\"addMapping()\"\n                  title=\"Add mapping\">\n            <i class=\"icon-plus\"></i>\n          </button>\n          <button class=\"btn\"\n                  ng-click=\"deleteDialog = true\"\n                  title=\"Delete mapping\">\n            <i class=\"icon-minus\"></i>\n          </button>\n          &nbsp;\n          &nbsp;\n          <label class=\"inline-block\" for=\"map_id\">Map ID: </label>\n          <input id=\"map_id\" type=\"text\" class=\"input-xxlarge no-bottom-margin\" ng-model=\"selectedMapping.map_id\">\n        </div>\n      </div>\n\n      <div class=\"row-fluid\">\n        <!-- \"From\" class header -->\n        <div class=\"span5\">\n          <div class=\"row-fluid\">\n            <input type=\"text\" class=\"span12\"\n                   ng-model=\"aName\"\n                   typeahead=\"title for title in classNames($viewValue) | filter:$viewValue\"\n                   typeahead-editable=\"true\" title=\"Java classname for class \'A\'\"\n                   placeholder=\"Java classname for class \'A\'\">\n          </div>\n          <div class=\"row-fluid\" ng-show=\"selectedMapping.class_a.error\">\n            <div class=\"alert alert-error\">\n              <div class=\"expandable closed\">\n                <div class=\"title\">\n                  <i class=\"expandable-indicator\"></i> Failed to load properties for {{selectedMapping.class_a.value}} due to {{selectedMapping.class_a.error.type}}\n                </div>\n                <div class=\"expandable-body well\">\n                  <div ng-bind-html-unsafe=\"formatStackTrace(selectedMapping.class_a.error.stackTrace)\"></div>\n                </div>\n              </div>\n            </div>\n          </div>\n        </div>\n\n        <div class=\"span2 centered\">\n          <button class=\"btn\" ng-click=\"doReload()\" ng-disabled=\"disableReload()\"><i class=\"icon-refresh\"></i> Reload</button>\n        </div>\n\n        <!-- \"To\" class header -->\n        <div class=\"span5\">\n          <div class=\"row-fluid\">\n            <input type=\"text\" class=\"span12\"\n                   ng-model=\"bName\"\n                   typeahead=\"title for title in classNames($viewValue) | filter:$viewValue\"\n                   typeahead-editable=\"true\" title=\"Java classname for class \'B\'\"\n                   placeholder=\"Java classname for class \'B\'\">\n          </div>\n          <div class=\"row-fluid\" ng-show=\"selectedMapping.class_b.error\">\n            <div class=\"alert alert-error\">\n              <div class=\"expandable closed\">\n                <div class=\"title\">\n                  <i class=\"expandable-indicator\"></i> Failed to load properties for {{selectedMapping.class_b.value}} due to {{selectedMapping.class_b.error.type}}\n                </div>\n                <div class=\"expandable-body well\">\n                  <div ng-bind-html-unsafe=\"formatStackTrace(selectedMapping.class_b.error.stackTrace)\"></div>\n                </div>\n              </div>\n            </div>\n          </div>\n        </div>\n\n      </div>\n\n      <script type=\"text/ng-template\" id=\"property.html\">\n        <span class=\"jsplumb-node dozer-mapping-node\"\n              id=\"{{field.id}}\"\n              anchors=\"{{field.anchor}}\"\n              field-path=\"{{field.path}}\">\n          <strong>{{field.displayName}}</strong> : <span class=\"typeName\">{{field.typeName}}</span>\n        </span>\n        <ul>\n          <li ng-repeat=\"field in field.properties\"\n              ng-include=\"\'property.html\'\"></li>\n        </ul>\n      </script>\n\n\n      <script type=\"text/ng-template\" id=\"pageTemplate.html\">\n        <div hawtio-jsplumb draggable=\"false\" layout=\"false\" timeout=\"500\">\n\n          <!-- \"from\" class -->\n          <div class=\"span6\">\n            <div class=\"row-fluid\" ng-hide=\"selectedMapping.class_a.error\">\n              <ul class=\"dozer-mappings from\">\n                <li ng-repeat=\"field in selectedMapping.class_a.properties\"\n                    ng-include=\"\'property.html\'\"></li>\n              </ul>\n            </div>\n          </div>\n\n\n          <!-- \"to\" class -->\n          <div class=\"span6\">\n            <div class=\"row-fluid\" ng-hide=\"selectedMapping.class_b.error\">\n              <ul class=\"dozer-mappings to\">\n                <li ng-repeat=\"field in selectedMapping.class_b.properties\"\n                    ng-include=\"\'property.html\'\"></li>\n              </ul>\n            </div>\n          </div>\n        </div>\n      </script>\n      <div class=\"row-fluid\" compile=\"main\"></div>\n\n    </div>\n\n    <div class=\"tab-pane\" title=\"Tree\">\n\n      <div class=\"row-fluid\">\n        <div class=\"span12\">\n          <ul class=\"nav nav-pills\">\n            <li>\n              <a href=\'\' title=\"Add a new mapping between two classes\" ng-click=\"addMapping()\" data-placement=\"bottom\">\n                <i class=\"icon-plus\"></i> Class</a></li>\n            <li>\n              <a href=\'\' title=\"Add new mappings between fields in these classes\" ng-disable=\"!selectedMapping\" ng-click=\"addField()\" data-placement=\"bottom\">\n                <i class=\"icon-plus\"></i> Field</a></li>\n            <li>\n              <a href=\'\' title=\"Deletes the selected item\" ng-disabled=\"!canDelete()\" ng-click=\"deleteDialog = true\" data-placement=\"bottom\">\n                <i class=\"icon-remove\"></i> Delete</a></li>\n          </ul>\n        </div>\n      </div>\n\n      <div class=\"row-fluid\">\n        <div id=\"tree-container\" class=\"span4\">\n          <div hawtio-tree=\"mappingTree\" onselect=\"onNodeSelect\" onDragEnter=\"onNodeDragEnter\" onDrop=\"onNodeDrop\"\n               onRoot=\"onRootTreeNode\"\n               hideRoot=\"true\"></div>\n        </div>\n\n        <div class=\"span8\">\n          <div ng-include=\"propertiesTemplate\"></div>\n        </div>\n      </div>\n\n      <div hawtio-confirm-dialog=\"deleteDialog\"\n           ok-button-text=\"Delete\"\n           on-ok=\"removeNode()\">\n        <div class=\"dialog-body\">\n          <p>You are about to delete the selected {{selectedDescription}}\n          </p>\n          <p>This operation cannot be undone so please be careful.</p>\n        </div>\n      </div>\n\n      <div class=\"modal-large\">\n        <div modal=\"addDialog.show\" close=\"addDialog.close()\" ng-options=\"addDialog.options\">\n          <form class=\"form-horizontal no-bottom-margin\" ng-submit=\"addAndCloseDialog()\">\n            <div class=\"modal-header\"><h4>Add Fields</h4></div>\n            <div class=\"modal-body\">\n              <table class=\"\">\n                <tr>\n                  <th>From</th>\n                  <th></th>\n                  <th>To</th>\n                  <th>Exclude</th>\n                </tr>\n                <tr ng-repeat=\"unmapped in unmappedFields\">\n                  <td>\n                    {{unmapped.fromField}}\n                  </td>\n                  <td>-></td>\n                  <td>\n                    <input type=\"text\" ng-model=\"unmapped.toField\" ng-change=\"onUnmappedFieldChange(unmapped)\"\n                           typeahead=\"title for title in toFieldNames($viewValue) | filter:$viewValue\" typeahead-editable=\'true\'\n                           title=\"The field to map to\"/>\n                  </td>\n                  <td>\n                    <input type=\"checkbox\" ng-model=\"unmapped.exclude\" ng-click=\"onUnmappedFieldChange(unmapped)\"\n                           title=\"Whether or not the field should be excluded\"/>\n                  </td>\n                </tr>\n              </table>\n            </div>\n            <div class=\"modal-footer\">\n              <input id=\"submit\" class=\"btn btn-primary add\" type=\"submit\" ng-disabled=\"!unmappedFieldsHasValid\"\n                     value=\"Add\">\n              <button class=\"btn btn-warning cancel\" type=\"button\" ng-click=\"addDialog.close()\">Cancel</button>\n            </div>\n          </form>\n        </div>\n      </div>\n    </div>\n\n  </div>\n\n  <div class=\"hero-unit\" ng-show=\"missingContainer\">\n    <p>You cannot edit the dozer mapping file as there is no container running for the profile <b>{{profileId}}</b>.</p>\n\n    <p>\n      <a class=\"btn btn-primary btn-large\"\n         href=\"#/fabric/containers/createContainer?profileIds={{profileId}}&versionId={{versionId}}\">\n        Create a container for: <strong>{{profileId}}</strong>\n      </a>\n    </p>\n  </div>\n</div>\n");
$templateCache.put("plugins/wiki/html/dozerPropertiesEdit.html","<div simple-form name=\"formEditor\" entity=\'dozerEntity\' data=\'nodeModel\' schema=\"schema\"></div>\n");
$templateCache.put("plugins/wiki/html/editPage.html","<div ng-controller=\"Wiki.EditController\">\n  <div class=\"logbar\" ng-controller=\"Wiki.NavBarController\">\n    <div class=\"wiki logbar-container\">\n      <ul class=\"nav nav-tabs\">\n        <li ng-repeat=\"link in breadcrumbs\" ng-class=\'{active : isActive(link.href)}\'>\n          <a ng-href=\"{{link.href}}{{hash}}\">{{link.name}}</a>\n        </li>\n\n        <li class=\"pull-right\">\n          <a id=\"saveButton\"\n             href=\"\"\n             ng-disabled=\"canSave()\"\n             ng-click=\"save()\"\n             title=\"Saves the updated wiki page\">\n            <i class=\"icon-save\"></i> Save</a>\n        </li>\n        <li class=\"pull-right\">\n          <a id=\"cancelButton\"\n             href=\"\"\n             ng-click=\"cancel()\"\n             title=\"Discards any updates\">\n            <i class=\"icon-remove\"></i> Cancel</a>\n        </li>\n      </ul>\n    </div>\n  </div>\n\n  <div class=\"wiki-fixed form-horizontal\">\n    <div class=\"control-group editor-autoresize\">\n      <div ng-include=\"sourceView\" class=\"editor-autoresize\"></div>\n    </div>\n  </div>\n</div>\n");
$templateCache.put("plugins/wiki/html/formEdit.html","<div simple-form name=\"formEditor\" entity=\'formEntity\' data=\'formDefinition\'></div>\n");
$templateCache.put("plugins/wiki/html/formTable.html","<div ng-controller=\"Wiki.FormTableController\">\n  <div class=\"logbar\" ng-controller=\"Wiki.NavBarController\">\n    <div class=\"wiki logbar-container\">\n      <ul class=\"nav nav-tabs\">\n        <li ng-repeat=\"link in breadcrumbs\" ng-class=\'{active : isActive(link.href)}\'>\n          <a ng-href=\"{{link.href}}{{hash}}\">{{link.name}}</a>\n        </li>\n\n        <li class=\"pull-right\">\n          <a ng-href=\"{{editLink()}}{{hash}}\" ng-hide=\"!editLink()\" title=\"Edit this page\"\n             data-placement=\"bottom\">\n            <i class=\"icon-edit\"></i> Edit</a></li>\n        <li class=\"pull-right\">\n          <a ng-href=\"{{historyLink}}{{hash}}\" ng-hide=\"!historyLink\" title=\"View the history of this file\"\n             data-placement=\"bottom\">\n            <i class=\"icon-comments-alt\"></i> History</a></li>\n        <li class=\"pull-right\">\n          <a ng-href=\"{{createLink()}}{{hash}}\" title=\"Create new page\"\n             data-placement=\"bottom\">\n            <i class=\"icon-plus\"></i> Create</a></li>\n        <li class=\"pull-right\" ng-show=\"sourceLink()\">\n          <a ng-href=\"{{sourceLink()}}\" title=\"View source code\"\n             data-placement=\"bottom\">\n            <i class=\"icon-file-alt\"></i> Source</a></li>\n      </ul>\n    </div>\n  </div>\n\n  <div class=\"wiki-fixed row-fluid\">\n    <input class=\"search-query span12\" type=\"text\" ng-model=\"gridOptions.filterOptions.filterText\"\n           placeholder=\"Filter...\">\n  </div>\n\n  <div class=\"form-horizontal\">\n    <div class=\"row-fluid\">\n      <div ng-include=\"tableView\"></div>\n    </div>\n  </div>\n</div>\n");
$templateCache.put("plugins/wiki/html/formTableDatatable.html","<div class=\"gridStyle\" hawtio-datatable=\"gridOptions\"></div>\n");
$templateCache.put("plugins/wiki/html/formView.html","<div simple-form name=\"formViewer\" mode=\'view\' entity=\'formEntity\' data=\'formDefinition\'></div>\n");
$templateCache.put("plugins/wiki/html/gitPreferences.html","<div title=\"Git\" ng-controller=\"Wiki.GitPreferences\">\n  <form class=\"form-horizontal\">\n    <div class=\"control-group\">\n      <label class=\"control-label\" for=\"gitUserName\"\n             title=\"The user name to be used when making changes to files with the source control system\">User\n        name</label>\n\n      <div class=\"controls\">\n        <input id=\"gitUserName\" type=\"text\" placeholder=\"username\" ng-model=\"gitUserName\"  autofill/>\n      </div>\n    </div>\n    <div class=\"control-group\">\n      <label class=\"control-label\" for=\"gitUserEmail\"\n             title=\"The email address to use when making changes to files with the source control system\">Email\n        address</label>\n\n      <div class=\"controls\">\n        <input id=\"gitUserEmail\" type=\"email\" placeholder=\"email\" ng-model=\"gitUserEmail\"/>\n      </div>\n    </div>\n  </form>\n</div>\n");
$templateCache.put("plugins/wiki/html/history.html","<link rel=\"stylesheet\" href=\"app/wiki/css/wiki.css\" type=\"text/css\"/>\n\n<div ng-controller=\"Wiki.HistoryController\">\n  <script type=\"text/ng-template\" id=\"changeCellTemplate.html\">\n    <div class=\"ngCellText\">\n      <a class=\"commit-link\" ng-href=\"{{row.entity.commitLink}}{{hash}}\" title=\"{{row.entity.name}}\">{{row.entity.commitHashText}}\n        <i class=\"icon-circle-arrow-right\"></i></a>\n    </div>\n  </script>\n\n  <div ng-hide=\"inDashboard\" class=\"logbar\" ng-controller=\"Wiki.NavBarController\">\n    <div class=\"wiki logbar-container\">\n      <ul class=\"nav nav-tabs\">\n        <li ng-show=\"branches.length || branch\" class=\"dropdown\">\n          <a href=\"#\" class=\"dropdown-toggle\" data-toggle=\"dropdown\"\n             title=\"The branch to view\">\n            {{branch || \'branch\'}}\n            <span class=\"caret\"></span>\n          </a>\n          <ul class=\"dropdown-menu\">\n            <li ng-repeat=\"otherBranch in branches\">\n              <a ng-href=\"{{branchLink(otherBranch)}}{{hash}}\"\n                 ng-hide=\"otherBranch === branch\"\n                 title=\"Switch to the {{otherBranch}} branch\"\n                 data-placement=\"bottom\">\n                {{otherBranch}}</a>\n            </li>\n          </ul>\n        </li>\n        <li ng-repeat=\"link in breadcrumbs\">\n          <a ng-href=\"{{link.href}}{{hash}}\">{{link.name}}</a>\n        </li>\n        <li class=\"ng-scope active\">\n          <a>History</a>\n        </li>\n\n        <li class=\"pull-right\" hawtio-show object-name=\"{{gitMBean}}\" method-name=\"write\">\n          <a ng-href=\"{{editLink()}}{{hash}}\" ng-hide=\"!editLink()\" title=\"Edit this page\"\n             data-placement=\"bottom\">\n            <i class=\"icon-edit\"></i> Edit</a></li>\n        <li class=\"pull-right\">\n          <a ng-href=\"{{historyLink}}{{hash}}\" ng-hide=\"!historyLink\" title=\"View the history of this file\"\n             data-placement=\"bottom\">\n            <i class=\"icon-comments-alt\"></i> History</a></li>\n        <li class=\"pull-right\" hawtio-show object-name=\"{{gitMBean}}\" method-name=\"write\">\n          <a ng-href=\"{{createLink()}}{{hash}}\" title=\"Create new page\"\n             data-placement=\"bottom\">\n            <i class=\"icon-plus\"></i> Create</a></li>\n      </ul>\n    </div>\n  </div>\n\n  <div class=\"wiki-fixed row-fluid\">\n    <div class=\"span4\">\n      <div class=\"control-group\">\n        <button class=\"btn\" ng-disabled=\"!selectedItems.length\" ng-click=\"diff()\"\n                title=\"Compare the selected versions of the files to see how they differ\"><i\n                class=\"icon-exchange\"></i>\n          Compare\n        </button>\n\n        <button class=\"btn\" ng-disabled=\"!canRevert()\" ng-click=\"revert()\"\n                title=\"Revert to this version of the file\" hawtio-show object-name=\"{{gitMBean}}\" method-name=\"revertTo\"><i class=\"icon-exchange\"></i> Revert\n        </button>\n      </div>\n    </div>\n    <div class=\"span8\">\n      <div class=\"control-group\">\n        <input class=\"span12 search-query\" type=\"text\" ng-model=\"gridOptions.filterOptions.filterText\"\n               placeholder=\"search\">\n      </div>\n    </div>\n  </div>\n\n  <div class=\"form-horizontal\">\n    <!--\n        <div class=\"row-fluid\">\n            <div class=\"gridStyle\" ng-grid=\"gridOptions\"></div>\n        </div>\n    </div>-->\n\n    <div class=\"row-fluid\">\n      <table class=\"table-condensed table-striped\" hawtio-simple-table=\"gridOptions\"></table>\n    </div>\n\n  </div>\n</div>\n");
$templateCache.put("plugins/wiki/html/layoutWiki.html","<div class=\"row-fluid\" ng-controller=\"Wiki.TopLevelController\">\n  <div ng-view></div>\n</div>\n\n");
$templateCache.put("plugins/wiki/html/sourceEdit.html","<textarea id=\"source\" ui-codemirror=\"codeMirrorOptions\" ng-model=\"entity.source\"></textarea>\n");
$templateCache.put("plugins/wiki/html/sourceView.html","<textarea id=\"source\" ui-codemirror=\"codeMirrorOptions\" ng-model=\"source\"></textarea>\n");
$templateCache.put("plugins/wiki/html/viewBook.html","<div ng-controller=\"Wiki.ViewController\">\n\n  <script type=\"text/ng-template\" id=\"fileCellTemplate.html\">\n    <div class=\"ngCellText\"\n         title=\"{{fileName(row.entity)}} - Last Modified: {{row.entity.lastModified | date:\'medium\'}}, Size: {{row.entity.length}}\">\n      <a href=\"{{childLink(row.entity)}}\" class=\"file-name\">\n        <span class=\"file-icon\"\n              ng-class=\"fileClass(row.entity)\"\n              ng-bind-html-unsafe=\"fileIconHtml(row)\">\n\n              </span>{{fileName(row.entity)}}\n      </a>\n    </div>\n  </script>\n\n  <script type=\"text/ng-template\" id=\"fileColumnTemplate.html\">\n\n    <div class=\"ngHeaderSortColumn {{col.headerClass}}\"\n         ng-style=\"{\'cursor\': col.cursor}\"\n         ng-class=\"{ \'ngSorted\': !noSortVisible }\">\n\n      <div class=\"ngHeaderText\" ng-hide=\"pageId === \'/\'\">\n        <a ng-href=\"{{parentLink()}}\"\n           class=\"wiki-file-list-up\"\n           title=\"Open the parent folder\">\n          <i class=\"icon-level-up\"></i> Up a directory\n        </a>\n      </div>\n    </div>\n\n  </script>\n\n  <ng-include src=\"\'app/wiki/html/viewNavBar.html\'\"></ng-include>\n\n  <div class=\"wiki-fixed form-horizontal\">\n    <div class=\"row-fluid\">\n      <div class=\"tocify\" wiki-href-adjuster>\n        <!-- TODO we maybe want a more flexible way to find the links to include than the current link-filter -->\n        <div hawtio-toc-display get-contents=\"getContents(filename, cb)\"\n             html=\"html\" link-filter=\"[file-extension]\">\n        </div>\n      </div>\n      <div class=\"toc-content\" id=\"toc-content\"></div>\n    </div>\n  </div>\n</div>\n");
$templateCache.put("plugins/wiki/html/viewNavBar.html","<div ng-hide=\"inDashboard\" class=\"logbar\" ng-controller=\"Wiki.NavBarController\">\n  <div class=\"wiki logbar-container\">\n    <ul class=\"nav nav-tabs\">\n      <li ng-show=\"branches.length || branch\">\n        <div hawtio-drop-down=\"branchMenuConfig\"></div>\n      </li>\n      <li ng-repeat=\"link in breadcrumbs\" ng-class=\'{active : isActive(link.href) && !objectId}\'>\n        <a class=\"breadcrumb-link\" ng-href=\"{{link.href}}\">\n          <span class=\"contained c-medium\">{{link.name}}</span>\n        </a>\n      </li>\n      <li ng-show=\"objectId\">\n        <a ng-href=\"{{historyLink}}{{hash}}\">History</a>\n      </li>\n      <li ng-show=\"objectId\" class=\"active\">\n        <a>{{objectId}}</a>\n      </li>\n\n      <li class=\"pull-right dropdown\">\n        <a href=\"#\" class=\"dropdown-toggle\" data-toggle=\"dropdown\">\n          Actions <span class=\"caret\"></span>\n        </a>\n        <ul class=\"dropdown-menu\">\n          <li ng-show=\"sourceLink()\">\n            <a ng-href=\"{{sourceLink()}}\" title=\"View source code\"\n               data-placement=\"bottom\">\n              <i class=\"icon-file-alt\"></i> Source</a>\n          </li>\n          <li>\n            <a ng-href=\"{{historyLink}}{{hash}}\" ng-hide=\"!historyLink\" title=\"View the history of this file\"\n               data-placement=\"bottom\">\n              <i class=\"icon-comments-alt\"></i> History</a>\n          </li>\n          <!--\n          <li class=\"divider\">\n          </li>\n          -->\n          <li ng-hide=\"gridOptions.selectedItems.length !== 1\" hawtio-show object-name=\"{{gitMBean}}\" method-name=\"rename\">\n            <a ng-click=\"openRenameDialog()\"\n               title=\"Rename the selected document\"\n               data-placement=\"bottom\">\n              <i class=\"icon-adjust\"></i> Rename</a>\n          </li>\n          <li ng-hide=\"!gridOptions.selectedItems.length\" hawtio-show object-name=\"{{gitMBean}}\" method-name=\"rename\">\n            <a ng-click=\"openMoveDialog()\"\n               title=\"move the selected documents to a new folder\"\n               data-placement=\"bottom\">\n              <i class=\"icon-move\"></i> Move</a>\n          </li>\n          <!--\n          <li class=\"divider\">\n          </li>\n          -->\n          <li ng-hide=\"!gridOptions.selectedItems.length\" hawtio-show object-name=\"{{gitMBean}}\" method-name=\"remove\">\n            <a ng-click=\"openDeleteDialog()\"\n               title=\"Delete the selected document(s)\"\n               data-placement=\"bottom\">\n              <i class=\"icon-remove\"></i> Delete</a>\n          </li>\n          <li class=\"divider\" ng-show=\"childActions.length\">\n          </li>\n          <li ng-repeat=\"childAction in childActions\">\n            <a ng-click=\"childAction.doAction()\"\n               title=\"{{childAction.title}}\"\n               data-placement=\"bottom\">\n              <i class=\"{{childAction.icon}}\"></i> {{childAction.name}}</a>\n          </li>\n        </ul>\n      </li>\n      <li class=\"pull-right\" hawtio-show object-name=\"{{gitMBean}}\" method-name=\"write\">\n        <a ng-href=\"{{editLink()}}{{hash}}\" ng-hide=\"!editLink()\" title=\"Edit this page\"\n           data-placement=\"bottom\">\n          <i class=\"icon-edit\"></i> Edit</a>\n      </li>\n      <li class=\"pull-right\" hawtio-show object-name=\"{{gitMBean}}\" method-name=\"write\">\n        <a ng-href=\"{{createLink()}}{{hash}}\"\n           title=\"Create new page\"\n           data-placement=\"bottom\">\n          <i class=\"icon-plus\"></i> Create</a>\n      </li>\n      <li class=\"pull-right\">\n        <div class=\"btn-group\" \n             ng-hide=\"!children || profile\">\n          <a class=\"btn btn-small\"\n             ng-disabled=\"mode == ViewMode.List\"\n             href=\"\" \n             ng-click=\"setViewMode(ViewMode.List)\">\n            <i class=\"icon-list\"></i></a>\n          <a class=\"btn btn-small\" \n             ng-disabled=\"mode == ViewMode.Icon\"\n             href=\"\" \n             ng-click=\"setViewMode(ViewMode.Icon)\">\n            <i class=\"icon-th-large\"></i></a>\n        </div>\n      </li>\n      <li class=\"pull-right\">\n        <a href=\"\" ng-hide=\"children || profile\" title=\"Add to dashboard\" ng-href=\"{{createDashboardLink()}}\"\n           data-placement=\"bottom\">\n          <i class=\"icon-share\"></i>\n        </a>\n      </li>\n    </ul>\n  </div>\n</div>\n\n\n");
$templateCache.put("plugins/wiki/html/viewPage.html","<div ng-controller=\"Wiki.ViewController\">\n  <script type=\"text/ng-template\" id=\"fileCellTemplate.html\">\n    <div class=\"ngCellText\"\n         title=\"{{fileName(row.entity)}} - Last Modified: {{row.entity.lastModified | date:\'medium\'}}, Size: {{row.entity.length}}\">\n      <a href=\"{{childLink(row.entity)}}\" class=\"file-name\" hawtio-file-drop=\"{{row.entity.fileName}}\" download-url=\"{{row.entity.downloadURL}}\">\n        <span class=\"file-icon\"\n              ng-class=\"fileClass(row.entity)\"\n              compile=\"fileIconHtml(row)\">\n        </span>{{fileName(row.entity)}}\n      </a>\n    </div>\n  </script>\n\n  <script type=\"text/ng-template\" id=\"fileColumnTemplate.html\">\n    <div class=\"ngHeaderSortColumn {{col.headerClass}}\"\n         ng-style=\"{\'cursor\': col.cursor}\"\n         ng-class=\"{ \'ngSorted\': !noSortVisible }\">\n      <div class=\"ngHeaderText\" ng-hide=\"pageId === \'/\'\">\n        <a ng-href=\"{{parentLink()}}\"\n           class=\"wiki-file-list-up\"\n           title=\"Open the parent folder\">\n          <i class=\"icon-level-up\"></i> Up a directory\n        </a>\n      </div>\n    </div>\n  </script>\n\n  <script type=\"text/ng-template\" id=\"imageTemplate.html\">\n    <img src=\"{{imageURL}}\">\n  </script>\n\n  <ng-include src=\"\'app/wiki/html/viewNavBar.html\'\"></ng-include>\n\n  <!-- Icon View -->\n  <div ng-show=\"mode == ViewMode.Icon\" class=\"wiki-fixed\">\n    <div ng-hide=\"!showAppHeader\">\n      <div class=\"row-fluid\">\n        <div class=\"span12\">\n          <div kubernetes-json=\"kubernetesJson\"></div>\n        </div>\n      </div>\n    </div>\n    <div ng-hide=\"!html\" wiki-href-adjuster wiki-title-linker>\n      <div class=\"row-fluid\" style=\"margin-left: 10px\">\n        <div class=\"span12\">\n          <div compile=\"html\"></div>\n        </div>\n      </div>\n    </div>\n    <div class=\"row-fluid\" ng-show=\"html && children\">\n      <div class=\"span12 wiki-icon-view-header\">\n        <h5>Directories and Files</h5>\n      </div>\n    </div>\n    <div class=\"row-fluid\" ng-hide=\"!directory\">\n      <div class=\"span12\" ng-controller=\"Wiki.FileDropController\">\n        <div class=\"wiki-icon-view\" nv-file-drop nv-file-over uploader=\"uploader\" over-class=\"ready-drop\">\n          <div class=\"column-box mouse-pointer well\"\n               ng-repeat=\"child in children\" \n               ng-class=\"isInGroup(gridOptions.selectedItems, child, \'selected\', \'\')\"\n               ng-click=\"toggleSelectionFromGroup(gridOptions.selectedItems, child)\">\n            <div class=\"row-fluid\">\n              <div class=\"span2\" hawtio-file-drop=\"{{child.fileName}}\" download-url=\"{{child.downloadURL}}\">\n                  <span class=\"app-logo\" ng-class=\"fileClass(child)\" compile=\"fileIconHtml(child)\"></span>\n              </div>\n              <div class=\"span10\">\n                <h3>\n                  <a href=\"{{childLink(child)}}\">{{child.displayName || child.name}}</a>\n                </h3>\n              </div>\n            </div>\n            <div class=\"row-fluid\" ng-show=\"child.summary\">\n              <div class=\"span12\">\n                <p compile=\"marked(child.summary)\"></p>\n              </div>\n            </div>\n          </div>\n        </div>\n      </div>\n    </div>\n  </div>\n  <!-- end Icon view -->\n\n  <!-- start List view -->\n  <div ng-show=\"mode == ViewMode.List\" class=\"wiki-fixed\">\n    <hawtio-pane position=\"left\" width=\"300\">\n      <div ng-controller=\"Wiki.FileDropController\">\n        <div class=\"wiki-list-view\" nv-file-drop nv-file-over uploader=\"uploader\" over-class=\"ready-drop\">\n          <div class=\"wiki-grid\" hawtio-list=\"gridOptions\"></div>\n        </div>\n      </div>\n    </hawtio-pane>\n    <div class=\"row-fluid\">\n      <div ng-class=\"span12\">\n        <div ng-hide=\"!showProfileHeader\">\n          <div class=\"row-fluid\">\n            <div class=\"span12\">\n              <div fabric-profile-details version-id=\"versionId\" profile-id=\"profileId\"></div>\n              <p></p>\n            </div>\n          </div>\n        </div>\n        <div ng-hide=\"!showAppHeader\">\n          <div class=\"row-fluid\">\n            <div class=\"span12\">\n              <div kubernetes-json=\"kubernetesJson\" children=\"children\"></div>\n            </div>\n          </div>\n        </div>\n        <div ng-hide=\"!html\" wiki-href-adjuster wiki-title-linker>\n          <div class=\"row-fluid\" style=\"margin-left: 10px\">\n            <div class=\"span12\">\n              <div compile=\"html\"></div>\n            </div>\n          </div>\n        </div>\n      </div>\n    </div>\n  </div>\n  <!-- end List view -->\n  <div ng-include=\"sourceView\" class=\"editor-autoresize\"></div>\n</div>\n");
$templateCache.put("plugins/wiki/html/modal/deleteDialog.html","<div>\n  <form class=\"form-horizontal\" ng-submit=\"deleteAndCloseDialog()\">\n    <div class=\"modal-header\"><h4>Delete Document</h4></div>\n    <div class=\"modal-body\">\n      <div class=\"control-group\">\n        <p>You are about to delete\n          <ng-pluralize count=\"gridOptions.selectedItems.length\"\n                        when=\"{\'1\': \'this document!\', \'other\': \'these {} documents!\'}\">\n          </ng-pluralize>\n        </p>\n\n        <div ng-bind-html-unsafe=\"selectedFileHtml\"></div>\n        <p class=\"alert alert-danger\" ng-show=\"warning\" ng-bind-html-unsafe=\"warning\">\n        </p>\n      </div>\n    </div>\n    <div class=\"modal-footer\">\n      <input class=\"btn btn-primary\" type=\"submit\"\n             value=\"Delete\">\n      <button class=\"btn btn-warning cancel\" type=\"button\" ng-click=\"close()\">Cancel</button>\n    </div>\n  </form>\n</div>\n");
$templateCache.put("plugins/wiki/html/modal/moveDialog.html","<div>\n    <form class=\"form-horizontal\" ng-submit=\"moveAndCloseDialog()\">\n    <div class=\"modal-header\"><h4>Move Document</h4></div>\n    <div class=\"modal-body\">\n      <div class=\"control-group\">\n        <label class=\"control-label\" for=\"moveFolder\">Folder</label>\n\n        <div class=\"controls\">\n          <input type=\"text\" id=\"moveFolder\" ng-model=\"move.moveFolder\"\n                 typeahead=\"title for title in folderNames($viewValue) | filter:$viewValue\" typeahead-editable=\'true\'>\n        </div>\n      </div>\n    </div>\n    <div class=\"modal-footer\">\n      <input class=\"btn btn-primary\" type=\"submit\"\n             ng-disabled=\"!move.moveFolder\"\n             value=\"Move\">\n      <button class=\"btn btn-warning cancel\" type=\"button\" ng-click=\"close()\">Cancel</button>\n    </div>\n  </form>\n</div>");
$templateCache.put("plugins/wiki/html/modal/renameDialog.html","<div>\n  <form class=\"form-horizontal\" ng-submit=\"renameAndCloseDialog()\">\n    <div class=\"modal-header\"><h4>Rename Document</h4></div>\n    <div class=\"modal-body\">\n      <div class=\"control-group\">\n        <label class=\"control-label\" for=\"renameFileName\">Name</label>\n\n        <div class=\"controls\">\n          <input type=\"text\" id=\"renameFileName\" ng-model=\"rename.newFileName\">\n        </div>\n      </div>\n\n      <div class=\"control-group\">\n        <div ng-show=\"fileExists.exists\" class=\"alert\">\n          Please choose a different name as <b>{{fileExists.name}}</b> already exists\n        </div>\n      </div>\n    </div>\n    <div class=\"modal-footer\">\n      <input class=\"btn btn-primary\" type=\"submit\"\n             ng-disabled=\"!fileName || fileExists.exists\"\n             value=\"Rename\">\n      <button class=\"btn btn-warning cancel\" type=\"button\" ng-click=\"close()\">Cancel</button>\n    </div>\n  </form>\n</div>\n");}]); hawtioPluginLoader.addModule("hawtio-wiki-templates");