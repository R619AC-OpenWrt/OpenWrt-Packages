String.prototype.replaceAll = function(search, replacement) {
  var target = this;
  return target.replace(new RegExp(search, 'g'), replacement);
};
(function () {
  var iwxhr = new XHR();
  var listElem = document.getElementById("list-content");
  listElem.onclick = handleClick;
  var currentPath;
  var pathElem = document.getElementById("current-path");
  pathElem.onblur = function () {
    update_list(this.value.trim());
  };
  pathElem.onkeyup = function (evt) {
    if (evt.keyCode == 13) {
      this.blur();
    }
  };
  function removePath(filename, isdir) {
    var c = confirm("Are you sure to delete " + filename + "?");
    if (c) {
      iwxhr.get('/cgi-bin/luci/admin/nas/fileassistant/delete',
        {
          path: concatPath(currentPath, filename),
          isdir: isdir
        },
        function (x, res) {
          if (res.ec === 0) {
            refresh_list(res.data, currentPath);
          }
      });
    }
  }

  function installPath(filename, isdir) {
    if (isdir === "1") {
      alert("This's a folder, please select a ipk to install！");
      return;
    }
    var isipk = isIPK(filename);
    if (isipk === 0) {
      alert("Only for ipk!");
      return;
    }
    var c = confirm("Are you sure to install  " + filename + "?");
    if (c) {
      iwxhr.get('/cgi-bin/luci/admin/nas/fileassistant/install',
        {
          filepath: concatPath(currentPath, filename),
          isdir: isdir
        },
        function (x, res) {
          if (res.ec === 0) {
            location.reload();
            alert("Successfully installed!");
          } else {
            alert("Installation failed, please check the file format!");
          }
      });
    }
  }

  function isIPK(filename) {
    var index= filename.lastIndexOf(".");
    var ext = filename.substr(index+1);
    if (ext === 'ipk') {
      return 1;
    } else {
      return 0;
    }
  }

  function renamePath(filename) {
    var newname = prompt("Please input a new file name：", filename);
    if (newname) {
      newname = newname.trim();
      if (newname != filename) {
        var newpath = concatPath(currentPath, newname);
        iwxhr.get('/cgi-bin/luci/admin/nas/fileassistant/rename',
          {
            filepath: concatPath(currentPath, filename),
            newpath: newpath
          },
          function (x, res) {
            if (res.ec === 0) {
              refresh_list(res.data, currentPath);
            }
          }
        );
      }
    }
  }

  function chmodPath(filename, isdir) {
    var newmod = prompt("Please enter a new permission bit (oct. or a+x format is supported)", isdir === "1" ? "0755" : "0644");
    if (newmod) {
      iwxhr.get('/cgi-bin/luci/admin/nas/fileassistant/chmod',
        {
          filepath: concatPath(currentPath, filename),
          newmod: newmod
        },
        function (x, res) {
          if (res.ec === 0) {
            refresh_list(res.data, currentPath);
          }
        }
      );
    }
  }

  function chownPath(filename) {
    var newown = prompt("Please enter a new username (username or username:group format is supported)", "root");
    if (newown) {
      iwxhr.get('/cgi-bin/luci/admin/nas/fileassistant/chown',
        {
          filepath: concatPath(currentPath, filename),
          newown: newown
        },
        function (x, res) {
          if (res.ec === 0) {
            refresh_list(res.data, currentPath);
          }
        }
      );
    }
  }

  function openpath(filename, dirname) {
    dirname = dirname || currentPath;
    window.open('/cgi-bin/luci/admin/nas/fileassistant/open?path='
      + encodeURIComponent(dirname) + '&filename='
      + encodeURIComponent(filename));
  }

  function getFileElem(elem) {
    if (elem.className.indexOf('-icon') > -1) {
      return elem;
    }
    else if (elem.parentNode.className.indexOf('-icon') > -1) {
      return elem.parentNode;
    }
  }

  function concatPath(path, filename) {
    if (path === '/') {
      return path + filename;
    }
    else {
      return path.replace(/\/$/, '') + '/' + filename;
    }
  }

  function handleClick(evt) {
    var targetElem = evt.target;
    var infoElem;
    if (targetElem.className.indexOf('cbi-button-remove') > -1) {
      infoElem = targetElem.parentNode.parentNode;
      removePath(infoElem.dataset['filename'] , infoElem.dataset['isdir'])
    }
    else if (targetElem.className.indexOf('cbi-button-install') > -1) {
      infoElem = targetElem.parentNode.parentNode;
      installPath(infoElem.dataset['filename'] , infoElem.dataset['isdir'])
    }
    else if (targetElem.className.indexOf('cbi-button-edit') > -1) {
      renamePath(targetElem.parentNode.parentNode.dataset['filename']);
    }
    else if (targetElem.className.indexOf('cbi-button-chmod') > -1) {
      infoElem = targetElem.parentNode.parentNode;
      chmodPath(infoElem.dataset['filename'] , infoElem.dataset['isdir']);
    }
    else if (targetElem.className.indexOf('cbi-button-chown') > -1) {
      chownPath(targetElem.parentNode.parentNode.dataset['filename']);
    }
    else if (targetElem = getFileElem(targetElem)) {
      if (targetElem.className.indexOf('parent-icon') > -1) {
        update_list(currentPath.replace(/\/[^/]+($|\/$)/, ''));
      }
      else if (targetElem.className.indexOf('file-icon') > -1) {
        openpath(targetElem.parentNode.dataset['filename']);
      }
      else if (targetElem.className.indexOf('link-icon') > -1) {
        infoElem = targetElem.parentNode;
        var filepath = infoElem.dataset['linktarget'];
        if (filepath) {
          if (infoElem.dataset['isdir'] === "1") {
            update_list(filepath);
          }
          else {
            var lastSlash = filepath.lastIndexOf('/');
            openpath(filepath.substring(lastSlash + 1), filepath.substring(0, lastSlash));
          }
        }
      }
      else if (targetElem.className.indexOf('folder-icon') > -1) {
        update_list(concatPath(currentPath, targetElem.parentNode.dataset['filename']))
      }
    }
  }
  function refresh_list(filenames, path) {
    var listHtml = '<table class="cbi-section-table"><thead><tr class="cbi-section-table-row cbi-rowstyle-2">'
      +'<td class="cbi-value-field">File</td>'
      +'<td class="cbi-value-field">Owner</td>'
      +'<td class="cbi-value-field">Modifed</td>'
      +'<td class="cbi-value-field">Size</td>'
      +'<td class="cbi-value-field">Permissions</td>'
      +'<td class="cbi-section-table-cell">Ok</td>'
      +'</tr></thead><tbody>';
    if (path !== '/') {
      listHtml += '<tr class="cbi-section-table-row cbi-rowstyle-2"><td class="parent-icon" colspan="6"><strong>..</strong></td></tr>';
    }
    if (filenames) {
      for (var i = 0; i < filenames.length; i++) {
        var line = filenames[i];
        if (line) {
          var f = line.match(/(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+([\S\s]+)/);
          var isLink = f[1][0] === 'z' || f[1][0] === 'l' || f[1][0] === 'x';
          var o = {
            displayname: f[9],
            filename: isLink ? f[9].split(' -> ')[0] : f[9],
            perms: f[1],
            date: f[7] + ' ' + f[6] + ' ' + f[8],
            size: f[5],
            owner: f[3],
            icon: (f[1][0] === 'd') ? "folder-icon" : (isLink ? "link-icon" : "file-icon")
          };
		  
		  var install_btn = '<button class="cbi-button cbi-button-install" style="visibility: hidden;">Install</button>';
          var index= o.filename.lastIndexOf(".");
		  var ext = o.filename.substr(index+1);
          if (ext === 'ipk') {
            install_btn = '<button class="cbi-button cbi-button-install">Install</button>';
          }
		  
          listHtml += '<tr class="cbi-section-table-row cbi-rowstyle-' + (1 + i%2)
            + '" data-filename="' + o.filename + '" data-isdir="' + Number(f[1][0] === 'd' || f[1][0] === 'z') + '"'
            + ((f[1][0] === 'z' || f[1][0] === 'l') ? (' data-linktarget="' + f[9].split(' -> ')[1]) : '')
            + '">'
            + '<td class="cbi-value-field ' + o.icon + '">'
            +   '<strong>' + o.displayname + '</strong>'
            + '</td>'
            + '<td class="cbi-value-field cbi-value-owner">'+o.owner+'</td>'
            + '<td class="cbi-value-field cbi-value-date">'+o.date+'</td>'
            + '<td class="cbi-value-field cbi-value-size">'+o.size+'</td>'
            + '<td class="cbi-value-field cbi-value-perm">'+o.perms+'</td>'
            + '<td class="cbi-section-table-cell">\
				<button class="cbi-button cbi-button-edit">Rename</button>\
                 <button class="cbi-button cbi-button-remove">Delete</button>\
				<button class="cbi-button cbi-button-apply cbi-button-chmod">Change Permissions</button>\
                <button class="cbi-button cbi-button-apply cbi-button-chown">Change Users</button>'
			+ install_btn
			+ '</td>'
            + '</tr>';
        }
      }
    }
    listHtml += "</table>";
    listElem.innerHTML = listHtml;
  }
  function update_list(path, opt) {
    opt = opt || {};
    path = concatPath(path, '');
    if (currentPath != path) {
      iwxhr.get('/cgi-bin/luci/admin/nas/fileassistant/list',
        {path: path},
        function (x, res) {
          if (res.ec === 0) {
            refresh_list(res.data, path);
          }
          else {
            refresh_list([], path);
          }
        }
      );
      if (!opt.popState) {
        history.pushState({path: path}, null, '?path=' + path);
      }
      currentPath = path;
      pathElem.value = currentPath;
    }
  };

  var uploadToggle = document.getElementById('upload-toggle');
  var uploadContainer = document.getElementById('upload-container');
  var isUploadHide = true;
  uploadToggle.onclick = function() {
    if (isUploadHide) {
      uploadContainer.style.display = 'inline-flex';
    }
    else {
      uploadContainer.style.display = 'none';
    }
    isUploadHide = !isUploadHide;
  };
  var uploadBtn = uploadContainer.getElementsByClassName('cbi-input-apply')[0];
  uploadBtn.onclick = function (evt) {
    var uploadinput = document.getElementById('upload-file');
    var fullPath = uploadinput.value;
    if (!fullPath) {
      evt.preventDefault();
    }
    else {
      var formData = new FormData();
      var startIndex = (fullPath.indexOf('\\') >= 0 ? fullPath.lastIndexOf('\\') : fullPath.lastIndexOf('/'));
      formData.append('upload-filename', fullPath.substring(startIndex + 1));
      formData.append('upload-dir', concatPath(currentPath, ''));
      formData.append('upload-file', uploadinput.files[0]);
      var xhr = new XMLHttpRequest();
      xhr.open("POST", "/cgi-bin/luci/admin/nas/fileassistant/upload", true);
      xhr.onload = function() {
        if (xhr.status == 200) {
          var res = JSON.parse(xhr.responseText);
          refresh_list(res.data, currentPath);
          uploadinput.value = '';
        }
        else {
          alert("Upload failed, please try again later...");
        }
      };
      xhr.send(formData);
    }
  };

  document.getElementById('mkdir-toggle').onclick = function() {
    var dirname = null;
    if (dirname = prompt("Pls enter a new folder name")) {
      var formData = new FormData();
      formData.append('path', currentPath);
      formData.append('dirname', dirname);
      var xhr = new XMLHttpRequest();
      xhr.open("POST", "/cgi-bin/luci/admin/nas/fileassistant/mkdir", true);
      xhr.onload = function() {
        if (xhr.status == 200) {
          var res = JSON.parse(xhr.responseText);
          refresh_list(res.data, currentPath);
        }
        else {
          alert("Create Failed, please try again later..");
        }
      };
      xhr.send(formData);
    }
  };
  document.addEventListener('DOMContentLoaded', function(evt) {
    var initPath = '/';
    if (/path=([/\w]+)/.test(location.search)) {
      initPath = RegExp.$1;
    }
    update_list(initPath, {popState: true});
  });
  window.addEventListener('popstate', function (evt) {
    var path = '/';
    if (evt.state && evt.state.path) {
      path = evt.state.path;
    }
    update_list(path, {popState: true});
  });

})();