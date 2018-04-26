/**
 * based off of oscP5message by andreas schlegel
 * oscP5 website at http://www.sojamo.de/oscP5
 */

import oscP5.*;
import netP5.*;

OscP5 oscP5;
NetAddress myRemoteLocation;

void setup() {
  size(400,400);
  frameRate(25);
  oscP5 = new OscP5(this, 12000);

  myRemoteLocation = new NetAddress("127.0.0.1",41234);
}


void draw() {
  background(0);
}

void mousePressed() {
  OscMessage assertMessage = new OscMessage("/assert");
  assertMessage.add("#processing is a program at (0.2, 0.3)");
  oscP5.send(assertMessage, myRemoteLocation);

  OscMessage assert2Message = new OscMessage("/assert");
  assert2Message.add("#coolprocessing is a notherprogram at (0.4, 0.4)");
  oscP5.send(assert2Message, myRemoteLocation);

  OscMessage selectMessage = new OscMessage("/select");
  selectMessage.add("$name is a $type at ($x, $y)");
  oscP5.send(selectMessage, myRemoteLocation); 
}